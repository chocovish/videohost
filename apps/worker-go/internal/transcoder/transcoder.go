package transcoder

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"videohost-worker-go/internal/progress"
	"videohost-worker-go/internal/s3"
	"videohost-worker-go/internal/urlutils"
)

const JobCancelledCode = "JOB_CANCELLED"

var ErrJobCancelled = errors.New("transcode job cancelled")

// FlexInt handles unmarshaling both JSON numbers (e.g. 6) and JSON strings (e.g. "6") into int.
type FlexInt int

func (f *FlexInt) UnmarshalJSON(b []byte) error {
	str := strings.Trim(string(b), `"'`+" \r\n")
	if str == "" || str == "null" {
		*f = 0
		return nil
	}
	val, err := strconv.Atoi(str)
	if err != nil {
		*f = 0
		return nil
	}
	*f = FlexInt(val)
	return nil
}

type TranscodeJobPayload struct {
	VideoId           string              `json:"videoId"`
	OrganizationId    string              `json:"organizationId"`
	OriginalKey       string              `json:"originalKey"`
	CallbackUrl       string              `json:"callbackUrl,omitempty"`
	S3                *s3.S3ConfigContext `json:"s3,omitempty"`
	Renditions        []RenditionConfig   `json:"renditions,omitempty"`
	StreamingSegments FlexInt             `json:"streamingSegments,omitempty"`
	HlsSegments       FlexInt             `json:"hlsSegments,omitempty"`
	SkipThumbnail     *bool               `json:"skipThumbnail,omitempty"`
	GenerateThumbnail *bool               `json:"generateThumbnail,omitempty"`
	Threads           int                 `json:"threads,omitempty"`
	WorkerCore        int                 `json:"workerCore,omitempty"`
	WorkerCores       int                 `json:"workerCores,omitempty"`
}

type ActiveJobEntry struct {
	cancel   context.CancelFunc
	cmd      *exec.Cmd
	mu       sync.Mutex
	payload  TranscodeJobPayload
	reporter *progress.ProgressReporter
	done     chan struct{}
}

var activeJobs sync.Map

func CancelActiveTranscode(videoId string) bool {
	val, ok := activeJobs.Load(videoId)
	if !ok {
		return false
	}

	entry := val.(*ActiveJobEntry)
	fmt.Printf("[Worker] Cancellation requested for active video %s, killing ffmpeg...\n", videoId)

	entry.mu.Lock()
	if entry.cancel != nil {
		entry.cancel()
	}
	if entry.cmd != nil && entry.cmd.Process != nil {
		_ = entry.cmd.Process.Kill()
	}
	entry.mu.Unlock()

	return true
}

func IsTranscodeActive(videoId string) bool {
	_, ok := activeJobs.Load(videoId)
	return ok
}

func GetActiveJobIds() []string {
	var ids []string
	activeJobs.Range(func(k, _ any) bool {
		ids = append(ids, k.(string))
		return true
	})
	return ids
}

func CancelAllActiveJobs(timeout time.Duration) {
	var doneChannels []chan struct{}
	var ids []string

	activeJobs.Range(func(k, v any) bool {
		ids = append(ids, k.(string))
		entry := v.(*ActiveJobEntry)
		doneChannels = append(doneChannels, entry.done)
		return true
	})

	if len(ids) == 0 {
		fmt.Println("[Worker] SIGTERM cleanup: no active jobs")
		return
	}

	fmt.Printf("[Worker] SIGTERM cleanup: cancelling %d active job(s): %s\n", len(ids), strings.Join(ids, ", "))
	for _, id := range ids {
		CancelActiveTranscode(id)
	}

	allDone := make(chan struct{})
	go func() {
		for _, ch := range doneChannels {
			<-ch
		}
		close(allDone)
	}()

	select {
	case <-allDone:
		fmt.Println("[Worker] SIGTERM cleanup: all active jobs finished cleanup")
	case <-time.After(timeout):
		fmt.Println("[Worker] SIGTERM cleanup: timeout waiting for active jobs cleanup")
	}
}

type RenditionResult struct {
	Resolution  string `json:"resolution"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	BitrateKbps int    `json:"bitrateKbps"`
	StorageKey  string `json:"storageKey"`
	SizeBytes   int64  `json:"sizeBytes"`
}

func randomString(n int) string {
	bytes := make([]byte, n)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)[:n]
}

var (
	timeProgressRegex = regexp.MustCompile(`time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)`)
	singleFileRegex   = regexp.MustCompile(`^stream_(\d+)\.mp4$`)
	chunkFileRegex    = regexp.MustCompile(`^(?:init|chunk)-stream(\d+)`)
)

func ProcessVideoJob(ctx context.Context, payload TranscodeJobPayload, onProgress ...progress.ProgressCallback) (map[string]any, error) {
	videoId := payload.VideoId
	if videoId == "" {
		return nil, errors.New("videoId is required")
	}

	orgId := payload.OrganizationId
	if orgId == "" {
		orgId = "default"
	}
	payload.OrganizationId = orgId

	if payload.OriginalKey == "" {
		payload.OriginalKey = fmt.Sprintf("videos/%s/%s/original.mp4", orgId, videoId)
	} else if !strings.Contains(payload.OriginalKey, "/") {
		payload.OriginalKey = fmt.Sprintf("videos/%s/%s/%s", orgId, videoId, payload.OriginalKey)
	}

	threadCount := payload.Threads
	if threadCount <= 0 && payload.WorkerCore > 0 {
		threadCount = payload.WorkerCore
	}
	if threadCount <= 0 && payload.WorkerCores > 0 {
		threadCount = payload.WorkerCores
	}
	if threadCount < 0 {
		threadCount = 0
	}

	fmt.Printf("[Worker Stateless] Starting transcoding for videoId: %s, key: %s\n", videoId, payload.OriginalKey)
	if threadCount == 0 {
		fmt.Println("[Worker Stateless] Using all available cores (threads=0) for transcoding")
	} else {
		fmt.Printf("[Worker Stateless] Using %d thread(s) for transcoding\n", threadCount)
	}

	reporter := progress.NewProgressReporter(videoId, orgId, payload.CallbackUrl, onProgress...)
	_ = reporter.Report(ctx, 0, "PROCESSING", true, nil)

	jobCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	doneChan := make(chan struct{})
	activeEntry := &ActiveJobEntry{
		cancel:   cancel,
		cmd:      nil,
		payload:  payload,
		reporter: reporter,
		done:     doneChan,
	}
	activeJobs.Store(videoId, activeEntry)
	defer func() {
		activeJobs.Delete(videoId)
		close(doneChan)
	}()

	isCancelled := func() bool {
		select {
		case <-jobCtx.Done():
			return true
		default:
			return false
		}
	}

	assertNotCancelled := func() error {
		if isCancelled() {
			return ErrJobCancelled
		}
		return nil
	}

	absTempDir, err := filepath.Abs(filepath.Join("temp", videoId))
	if err != nil {
		absTempDir = filepath.Join("temp", videoId)
	}
	tempDir := absTempDir
	_ = os.MkdirAll(tempDir, 0755)
	defer func() {
		if rmErr := os.RemoveAll(tempDir); rmErr != nil {
			fmt.Printf("[Worker] Warning: Failed to remove temp directory %s: %v\n", tempDir, rmErr)
		} else {
			fmt.Printf("[Worker] Cleaned up all local files in temp directory: %s\n", tempDir)
		}
	}()

	inputPath := filepath.ToSlash(filepath.Join(tempDir, "original.mp4"))
	var s3ThumbKey string
	// Helper for reporting failure on error
	handleError := func(err error) error {
		if errors.Is(err, ErrJobCancelled) || isCancelled() {
			fmt.Printf("[Worker] Transcode job for video %s was cancelled — cleaning up S3 and reporting CANCELLED\n", videoId)
			// Best-effort delete any partially uploaded dash data and thumbnail
			dashPrefix := fmt.Sprintf("videos/%s/%s/dash", orgId, videoId)
			legacyDashPrefix := fmt.Sprintf("%s/%s/dash", orgId, videoId)
			cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cleanupCancel()
			if delErr := s3.DeleteS3Prefix(cleanupCtx, dashPrefix, payload.S3); delErr != nil {
				fmt.Printf("[Worker] Failed to cleanup S3 prefix for cancelled video %s: %v\n", videoId, delErr)
			} else {
				fmt.Printf("[Worker] Cleaned up S3 dash prefix for cancelled video %s\n", videoId)
			}
			_ = s3.DeleteS3Prefix(cleanupCtx, legacyDashPrefix, payload.S3)
			if s3ThumbKey != "" {
				if delErr := s3.DeleteS3Object(cleanupCtx, s3ThumbKey, payload.S3); delErr != nil {
					fmt.Printf("[Worker] Failed to cleanup S3 thumbnail for cancelled video %s: %v\n", videoId, delErr)
				} else {
					fmt.Printf("[Worker] Cleaned up S3 thumbnail object for cancelled video %s\n", videoId)
				}
			}
			// Notify webapp that processing was cancelled (so UI can show retry)
			cancelledPayload := map[string]any{
				"videoId":        videoId,
				"organizationId": orgId,
				"status":         "CANCELLED",
				"progress":       0,
				"error":          "Transcoding cancelled (worker shutdown or user cancelled)",
			}
			_ = reporter.Report(context.Background(), 0, "CANCELLED", true, cancelledPayload)
			return ErrJobCancelled
		}
		fmt.Printf("[Worker] Error transcoding video %s: %v\n", videoId, err)
		failPayload := map[string]any{
			"videoId":        videoId,
			"organizationId": orgId,
			"status":         "FAILED",
			"progress":       0,
			"error":          err.Error(),
		}
		_ = reporter.Report(context.Background(), 0, "FAILED", true, failPayload)
		return err
	}

	if err := assertNotCancelled(); err != nil {
		return nil, handleError(err)
	}

	// 1. Download original file from S3/R2
	fmt.Printf("[Worker] Downloading source video: %s\n", payload.OriginalKey)
	if err := s3.DownloadFileFromS3(jobCtx, payload.OriginalKey, inputPath, payload.S3); err != nil {
		return nil, handleError(fmt.Errorf("failed downloading video: %w", err))
	}

	if err := assertNotCancelled(); err != nil {
		return nil, handleError(err)
	}

	// 2. Probe metadata
	meta, err := ProbeVideo(jobCtx, inputPath)
	if err != nil {
		return nil, handleError(fmt.Errorf("failed probing video: %w", err))
	}
	fmt.Printf("[Worker] Video probed: %dx%d, duration: %ds, hasAudio: %v, sar: %s\n",
		meta.Width, meta.Height, meta.Duration, meta.HasAudio, meta.SAR)

	// 3. Select target renditions
	candidates := payload.Renditions
	if len(candidates) == 0 {
		candidates = DefaultResolutionLadder
	}
	targetRenditions := SelectTargetRenditions(candidates, meta.Width, meta.Height, 100)

	var rendNames []string
	for _, r := range targetRenditions {
		rendNames = append(rendNames, r.Resolution)
	}
	fmt.Printf("[Worker] Generating renditions: %s\n", strings.Join(rendNames, ", "))

	dashOutputDir := filepath.Join(tempDir, "dash")
	_ = os.MkdirAll(dashOutputDir, 0755)

	masterManifestPath := filepath.ToSlash(filepath.Join(dashOutputDir, "master.mpd"))
	totalRenditions := len(targetRenditions)

	dar := ComputeTargetDAR(meta.Width, meta.Height, meta.SAR)

	var filterParts []string
	if totalRenditions > 1 {
		var splits []string
		for i := 0; i < totalRenditions; i++ {
			splits = append(splits, fmt.Sprintf("[v%d]", i))
		}
		filterParts = append(filterParts, fmt.Sprintf("[0:v]split=%d%s", totalRenditions, strings.Join(splits, "")))
	}

	for i, rend := range targetRenditions {
		inputLabel := "[0:v]"
		if totalRenditions > 1 {
			inputLabel = fmt.Sprintf("[v%d]", i)
		}
		filterParts = append(filterParts, fmt.Sprintf("%sscale=%d:%d:flags=bicubic,setdar=%d/%d:max=1000000[o%d]",
			inputLabel, rend.Width, rend.Height, dar.DarNum, dar.DarDen, i))
	}
	filterComplex := strings.Join(filterParts, ";")

	segmentsVal := int(payload.StreamingSegments)
	if segmentsVal <= 0 && int(payload.HlsSegments) > 0 {
		segmentsVal = int(payload.HlsSegments)
	}

	isSingleFile := segmentsVal <= 0
	segDuration := 6
	if !isSingleFile {
		segDuration = int(math.Max(1, float64(segmentsVal)))
	}

	modeStr := fmt.Sprintf("Chunked Segments (%ds chunk-stream*.m4s)", segDuration)
	if isSingleFile {
		modeStr = "Single-File (-single_file 1, byte-range stream_*.mp4)"
	}
	fmt.Printf("[Worker] Packaging mode: %s for %d representation(s)...\n",
		modeStr, totalRenditions)

	var dashPackagingOptions []string
	if isSingleFile {
		dashPackagingOptions = []string{
			"-seg_duration", strconv.Itoa(segDuration),
			"-window_size", "0",
			"-extra_window_size", "10",
			"-single_file", "1",
			"-single_file_name", "stream_$RepresentationID$.mp4",
			"-hls_playlist", "1",
			"-hls_master_name", "master.m3u8",
		}
	} else {
		dashPackagingOptions = []string{
			"-seg_duration", strconv.Itoa(segDuration),
			"-window_size", "0",
			"-extra_window_size", "10",
			"-init_seg_name", "init-stream$RepresentationID$.m4s",
			"-media_seg_name", "chunk-stream$RepresentationID$-$Number%05d$.m4s",
			"-hls_playlist", "1",
			"-hls_master_name", "master.m3u8",
		}
	}

	// Build FFmpeg command arguments
	ffmpegArgs := []string{
		"-y",
		"-threads", strconv.Itoa(threadCount),
		"-i", inputPath,
		"-preset", "veryfast",
		"-crf", "24",
		"-pix_fmt", "yuv420p",
		"-filter_complex", filterComplex,
	}

	for i := 0; i < totalRenditions; i++ {
		ffmpegArgs = append(ffmpegArgs, "-map", fmt.Sprintf("[o%d]", i))
	}
	ffmpegArgs = append(ffmpegArgs,
		"-map", "0:a?",
		"-c:v", "libx264",
		"-flags", "+cgop",
		"-force_key_frames", fmt.Sprintf("expr:gte(t,n_forced*%d)", segDuration),
		"-x264-params", "scenecut=0:open_gop=0",
		"-fps_mode:v", "passthrough",
	)

	for i, r := range targetRenditions {
		ffmpegArgs = append(ffmpegArgs,
			fmt.Sprintf("-b:v:%d", i), fmt.Sprintf("%dk", r.BitrateKbps),
			fmt.Sprintf("-maxrate:v:%d", i), fmt.Sprintf("%dk", int(math.Round(float64(r.BitrateKbps)*1.2))),
			fmt.Sprintf("-bufsize:v:%d", i), fmt.Sprintf("%dk", r.BitrateKbps*2),
		)
	}

	ffmpegArgs = append(ffmpegArgs,
		"-c:a", "aac",
		"-b:a", "128k",
		"-f", "dash",
	)
	ffmpegArgs = append(ffmpegArgs, dashPackagingOptions...)

	if meta.HasAudio {
		ffmpegArgs = append(ffmpegArgs, "-adaptation_sets", "id=0,streams=v id=1,streams=a")
	} else {
		ffmpegArgs = append(ffmpegArgs, "-adaptation_sets", "id=0,streams=v")
	}
	ffmpegArgs = append(ffmpegArgs, masterManifestPath)

	fmt.Printf("[Worker FFmpeg] Executing: ffmpeg %s\n", strings.Join(ffmpegArgs, " "))

	encodeCmd := exec.CommandContext(jobCtx, "ffmpeg", ffmpegArgs...)
	encodeCmd.Dir = dashOutputDir
	stderrPipe, err := encodeCmd.StderrPipe()
	if err != nil {
		return nil, handleError(fmt.Errorf("failed to open ffmpeg stderr: %w", err))
	}

	activeEntry.mu.Lock()
	activeEntry.cmd = encodeCmd
	activeEntry.mu.Unlock()

	if err := encodeCmd.Start(); err != nil {
		return nil, handleError(fmt.Errorf("failed to start ffmpeg: %w", err))
	}

	// Read stderr in background goroutine to parse progress
	var stderrLines []string
	var stderrMu sync.Mutex

	scanner := bufio.NewScanner(stderrPipe)
	for scanner.Scan() {
		line := scanner.Text()
		stderrMu.Lock()
		stderrLines = append(stderrLines, line)
		if len(stderrLines) > 50 {
			stderrLines = stderrLines[1:]
		}
		stderrMu.Unlock()

		if matches := timeProgressRegex.FindStringSubmatch(line); len(matches) > 1 {
			elapsed := progress.ParseTimemarkToSeconds(matches[1])
			transcodePercent := 0.0
			if meta.Duration > 0 {
				transcodePercent = math.Min(100.0, (elapsed/float64(meta.Duration))*100.0)
			}
			overallProgress := progress.CalculateTranscodeProgress(0, 1, transcodePercent)
			_ = reporter.Report(jobCtx, overallProgress, "PROCESSING", false, nil)
		}
	}

	if err := encodeCmd.Wait(); err != nil {
		stderrMu.Lock()
		lastLines := strings.Join(stderrLines, "\n")
		stderrMu.Unlock()
		fmt.Printf("[Worker FFmpeg Error] Last stderr output:\n%s\n", lastLines)
		return nil, handleError(err)
	}

	_ = reporter.Report(jobCtx, progress.CalculateTranscodeProgress(1, 1, 100.0), "PROCESSING", false, nil)

	if err := assertNotCancelled(); err != nil {
		return nil, handleError(err)
	}

	// 5. Clean up absolute paths from master.mpd
	if manifestBytes, err := os.ReadFile(masterManifestPath); err == nil {
		manifestStr := string(manifestBytes)
		dashOutputDirForward := filepath.ToSlash(dashOutputDir)
		dashOutputDirBack := strings.ReplaceAll(dashOutputDir, "/", "\\")

		manifestStr = strings.ReplaceAll(manifestStr, dashOutputDir+string(filepath.Separator), "")
		manifestStr = strings.ReplaceAll(manifestStr, dashOutputDir+"/", "")
		manifestStr = strings.ReplaceAll(manifestStr, dashOutputDirForward+"/", "")
		manifestStr = strings.ReplaceAll(manifestStr, dashOutputDirBack+"\\", "")
		manifestStr = strings.ReplaceAll(manifestStr, dashOutputDirForward, "")
		manifestStr = strings.ReplaceAll(manifestStr, dashOutputDirBack, "")

		_ = os.WriteFile(masterManifestPath, []byte(manifestStr), 0644)
	}

	masterM3u8Path := filepath.Join(dashOutputDir, "master.m3u8")
	if m3u8Bytes, err := os.ReadFile(masterM3u8Path); err == nil {
		m3u8Str := string(m3u8Bytes)
		dashOutputDirForward := filepath.ToSlash(dashOutputDir)
		dashOutputDirBack := strings.ReplaceAll(dashOutputDir, "/", "\\")

		m3u8Str = strings.ReplaceAll(m3u8Str, dashOutputDir+string(filepath.Separator), "")
		m3u8Str = strings.ReplaceAll(m3u8Str, dashOutputDir+"/", "")
		m3u8Str = strings.ReplaceAll(m3u8Str, dashOutputDirForward+"/", "")
		m3u8Str = strings.ReplaceAll(m3u8Str, dashOutputDirBack+"\\", "")
		m3u8Str = strings.ReplaceAll(m3u8Str, dashOutputDirForward, "")
		m3u8Str = strings.ReplaceAll(m3u8Str, dashOutputDirBack, "")

		_ = os.WriteFile(masterM3u8Path, []byte(m3u8Str), 0644)
	}

	// 6. Generate Thumbnail (WebP) if not skipped
	shouldGenerateThumbnail := true
	if payload.SkipThumbnail != nil && *payload.SkipThumbnail {
		shouldGenerateThumbnail = false
	}
	if payload.GenerateThumbnail != nil && !*payload.GenerateThumbnail {
		shouldGenerateThumbnail = false
	}

	s3DashPrefix := fmt.Sprintf("videos/%s/%s/dash", orgId, videoId)

	if shouldGenerateThumbnail {
		unique := fmt.Sprintf("%d-%s", time.Now().UnixMilli(), randomString(6))
		thumbFileName := fmt.Sprintf("thumbnail-%s.webp", unique)
		thumbnailPath := filepath.ToSlash(filepath.Join(tempDir, thumbFileName))

		seekTime := 0.0
		if meta.Duration > 0 {
			seekTime = math.Min(1.0, float64(meta.Duration)/2.0)
		}

		thumbCmd := exec.CommandContext(jobCtx, "ffmpeg",
			"-y",
			"-threads", strconv.Itoa(threadCount),
			"-ss", fmt.Sprintf("%.2f", seekTime),
			"-i", inputPath,
			"-frames:v", "1",
			"-vf", "scale='min(1280,iw)':-2:flags=bicubic",
			"-c:v", "libwebp",
			"-compression_level", "4",
			"-quality", "82",
			thumbnailPath,
		)

		activeEntry.mu.Lock()
		activeEntry.cmd = thumbCmd
		activeEntry.mu.Unlock()

		if err := thumbCmd.Run(); err != nil {
			return nil, handleError(fmt.Errorf("thumbnail generation failed: %w", err))
		}

		if err := assertNotCancelled(); err != nil {
			return nil, handleError(err)
		}

		s3ThumbKey = fmt.Sprintf("videos/%s/%s/%s", orgId, videoId, thumbFileName)
		fmt.Printf("[Worker] Uploading thumbnail (%s) to S3/R2...\n", thumbFileName)
		if _, err := s3.UploadFileToS3(jobCtx, thumbnailPath, s3ThumbKey, "image/webp", payload.S3); err != nil {
			return nil, handleError(fmt.Errorf("failed uploading thumbnail: %w", err))
		}
	} else {
		fmt.Printf("[Worker] Skipping thumbnail generation for videoId: %s\n", videoId)
	}

	if err := assertNotCancelled(); err != nil {
		return nil, handleError(err)
	}

	// 7. Clean up previous encoding attempt DASH files in S3 and upload new DASH structure
	fmt.Printf("[Worker] Cleaning up previous DASH files from S3 under %s...\n", s3DashPrefix)
	cleanupCtx, cleanupCancel := context.WithTimeout(jobCtx, 30*time.Second)
	_ = s3.DeleteS3Prefix(cleanupCtx, s3DashPrefix, payload.S3)
	_ = s3.DeleteS3Prefix(cleanupCtx, fmt.Sprintf("%s/%s/dash", orgId, videoId), payload.S3)
	cleanupCancel()

	if err := assertNotCancelled(); err != nil {
		return nil, handleError(err)
	}

	fmt.Printf("[Worker] Uploading DASH renditions to S3/R2 under %s...\n", s3DashPrefix)
	err = s3.UploadDirectoryToS3(jobCtx, dashOutputDir, s3DashPrefix, payload.S3, func(uploadRatio float64) {
		uploadProgress := progress.CalculateUploadProgress(uploadRatio * 0.9)
		_ = reporter.Report(jobCtx, uploadProgress, "PROCESSING", false, nil)
	})
	if err != nil {
		return nil, handleError(fmt.Errorf("failed uploading dash directory: %w", err))
	}

	finalUploadProgress := progress.CalculateUploadProgress(1.0)
	_ = reporter.Report(jobCtx, finalUploadProgress, "PROCESSING", false, nil)

	if err := assertNotCancelled(); err != nil {
		return nil, handleError(err)
	}

	// 8. Size calculation
	inputStat, err := os.Stat(inputPath)
	var originalSizeBytes int64
	if err == nil {
		originalSizeBytes = inputStat.Size()
	}

	streamSizes := make(map[int]int64)
	var totalDashSizeBytes int64

	_ = filepath.Walk(dashOutputDir, func(p string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			totalDashSizeBytes += info.Size()
			base := filepath.Base(p)
			if match := singleFileRegex.FindStringSubmatch(base); len(match) > 1 {
				if id, err := strconv.Atoi(match[1]); err == nil {
					streamSizes[id] += info.Size()
				}
			} else if match := chunkFileRegex.FindStringSubmatch(base); len(match) > 1 {
				if id, err := strconv.Atoi(match[1]); err == nil {
					streamSizes[id] += info.Size()
				}
			}
		}
		return nil
	})

	combinedSizeBytes := originalSizeBytes + totalDashSizeBytes
	audioStreamIndex := totalRenditions
	var audioSizeBytes int64
	if meta.HasAudio {
		audioSizeBytes = streamSizes[audioStreamIndex]
	}

	var renditionsResult []RenditionResult
	for i, r := range targetRenditions {
		renditionsResult = append(renditionsResult, RenditionResult{
			Resolution:  r.Resolution,
			Width:       r.Width,
			Height:      r.Height,
			BitrateKbps: r.BitrateKbps,
			StorageKey:  s3DashPrefix,
			SizeBytes:   streamSizes[i],
		})
	}

	if meta.HasAudio {
		renditionsResult = append(renditionsResult, RenditionResult{
			Resolution:  "Audio (AAC)",
			Width:       0,
			Height:      0,
			BitrateKbps: 128,
			StorageKey:  s3DashPrefix,
			SizeBytes:   audioSizeBytes,
		})
	}

	fmt.Printf("[Worker] Size stats for %s: Original=%d B, DASH=%d B, Combined=%d B\n",
		videoId, originalSizeBytes, totalDashSizeBytes, combinedSizeBytes)

	resultPayload := map[string]any{
		"videoId":                 videoId,
		"organizationId":          orgId,
		"status":                  "READY",
		"progress":                100,
		"durationSeconds":         meta.Duration,
		"sourceWidth":             meta.Width,
		"sourceHeight":            meta.Height,
		"thumbnailUrl":            s3ThumbKey,
		"renditions":              renditionsResult,
		"originalSizeBytes":       originalSizeBytes,
		"totalRenditionSizeBytes": totalDashSizeBytes,
		"combinedSizeBytes":       combinedSizeBytes,
	}

	convertedResult := urlutils.TransformJSONDockerHostToLocalhost(resultPayload).(map[string]any)

	fmt.Printf("[Worker] Transcoding complete for %s! Posting results to callback...\n", videoId)
	_ = reporter.Report(context.Background(), 100, "READY", true, convertedResult)

	return convertedResult, nil
}
