package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type RenditionConfig struct {
	Resolution  string `json:"resolution"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	BitrateKbps int    `json:"bitrateKbps"`
}

type TranscodeJobPayload struct {
	VideoID        string            `json:"videoId"`
	OrganizationID string            `json:"organizationId"`
	OriginalKey    string            `json:"originalKey"`
	CallbackURL    string            `json:"callbackUrl,omitempty"`
	S3             *S3ConfigContext  `json:"s3,omitempty"`
	Renditions     []RenditionConfig `json:"renditions,omitempty"`
}

type RenditionResult struct {
	Resolution string `json:"resolution"`
	Bitrate    int    `json:"bitrateKbps"`
	StorageKey string `json:"storageKey"`
	SizeBytes  int64  `json:"sizeBytes"`
}

type FFProbeOutput struct {
	Streams []struct {
		CodecType string `json:"codec_type"`
		Width     int    `json:"width"`
		Height    int    `json:"height"`
	} `json:"streams"`
	Format struct {
		Duration string `json:"duration"`
	} `json:"format"`
}

var DEFAULT_RESOLUTION_LADDER = []RenditionConfig{
	{Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
	{Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
	{Resolution: "1080p", Width: 1920, Height: 1080, BitrateKbps: 5500},
	{Resolution: "1440p", Width: 2560, Height: 1440, BitrateKbps: 9000},
	{Resolution: "4k", Width: 3840, Height: 2160, BitrateKbps: 18000},
}

func ParseEnvRenditions() []RenditionConfig {
	envResolutions := os.Getenv("HLS_RENDITION_RESOLUTIONS")
	if envResolutions == "" {
		return DEFAULT_RESOLUTION_LADDER
	}

	standardMap := map[string]RenditionConfig{
		"360":   {Resolution: "360p", Width: 640, Height: 360, BitrateKbps: 800},
		"360p":  {Resolution: "360p", Width: 640, Height: 360, BitrateKbps: 800},
		"480":   {Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
		"480p":  {Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
		"720":   {Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
		"720p":  {Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
		"1080":  {Resolution: "1080p", Width: 1920, Height: 1080, BitrateKbps: 5500},
		"1080p": {Resolution: "1080p", Width: 1920, Height: 1080, BitrateKbps: 5500},
		"1440":  {Resolution: "1440p", Width: 2560, Height: 1440, BitrateKbps: 9000},
		"1440p": {Resolution: "1440p", Width: 2560, Height: 1440, BitrateKbps: 9000},
		"2160":  {Resolution: "4k", Width: 3840, Height: 2160, BitrateKbps: 18000},
		"2160p": {Resolution: "4k", Width: 3840, Height: 2160, BitrateKbps: 18000},
		"4k":    {Resolution: "4k", Width: 3840, Height: 2160, BitrateKbps: 18000},
	}

	tokens := strings.Split(envResolutions, ",")
	var parsed []RenditionConfig

	for _, token := range tokens {
		t := strings.ToLower(strings.TrimSpace(token))
		if t == "" {
			continue
		}
		if rend, ok := standardMap[t]; ok {
			parsed = append(parsed, rend)
		} else {
			var height int
			if _, err := fmt.Sscanf(t, "%d", &height); err == nil && height > 0 {
				width := int(math.Round(float64(height) * 16.0 / 9.0))
				if width%2 != 0 {
					width++
				}
				bitrateKbps := 1500
				if height <= 360 {
					bitrateKbps = 800
				} else if height <= 480 {
					bitrateKbps = 1000
				} else if height <= 720 {
					bitrateKbps = 3000
				} else if height <= 1080 {
					bitrateKbps = 5500
				} else if height <= 1440 {
					bitrateKbps = 9000
				} else {
					bitrateKbps = 18000
				}
				parsed = append(parsed, RenditionConfig{
					Resolution:  fmt.Sprintf("%dp", height),
					Width:       width,
					Height:      height,
					BitrateKbps: bitrateKbps,
				})
			}
		}
	}

	if len(parsed) > 0 {
		return parsed
	}
	return DEFAULT_RESOLUTION_LADDER
}

func ProbeVideo(filePath string) (int, int, float64, error) {
	cmd := exec.Command("ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath)
	var outBytes bytes.Buffer
	cmd.Stdout = &outBytes

	if err := cmd.Run(); err != nil {
		return 1280, 720, 0, fmt.Errorf("ffprobe error: %w", err)
	}

	var meta FFProbeOutput
	if err := json.Unmarshal(outBytes.Bytes(), &meta); err != nil {
		return 1280, 720, 0, fmt.Errorf("failed to parse ffprobe json: %w", err)
	}

	width := 1280
	height := 720
	for _, stream := range meta.Streams {
		if stream.CodecType == "video" {
			if stream.Width > 0 {
				width = stream.Width
			}
			if stream.Height > 0 {
				height = stream.Height
			}
			break
		}
	}

	duration := 0.0
	if meta.Format.Duration != "" {
		if d, err := strconv.ParseFloat(meta.Format.Duration, 64); err == nil {
			duration = math.Round(d)
		}
	}

	return width, height, duration, nil
}

func calculateDirSize(dirPath string) int64 {
	var total int64
	_ = filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			total += info.Size()
		}
		return nil
	})
	return total
}

func ProcessVideoJob(payloadInput interface{}) (map[string]interface{}, error) {
	var rawPayload TranscodeJobPayload

	switch v := payloadInput.(type) {
	case string:
		rawPayload = TranscodeJobPayload{
			VideoID:        v,
			OrganizationID: "default",
			OriginalKey:    fmt.Sprintf("default/%s/original.mp4", v),
		}
	case TranscodeJobPayload:
		rawPayload = v
	default:
		payloadBytes, err := json.Marshal(payloadInput)
		if err != nil {
			return nil, fmt.Errorf("invalid payload structure: %w", err)
		}
		if err := json.Unmarshal(payloadBytes, &rawPayload); err != nil {
			return nil, fmt.Errorf("invalid payload JSON: %w", err)
		}
	}

	// Transform payload URLs using UseDockerHostForLocalhost logic
	transformedPayload := UseDockerHostForLocalhost(rawPayload)
	var payload TranscodeJobPayload
	if p, ok := transformedPayload.(TranscodeJobPayload); ok {
		payload = p
	} else {
		payloadBytes, _ := json.Marshal(transformedPayload)
		_ = json.Unmarshal(payloadBytes, &payload)
	}

	videoId := payload.VideoID
	organizationId := payload.OrganizationID
	if organizationId == "" {
		organizationId = "default"
	}
	originalKey := payload.OriginalKey
	callbackUrl := payload.CallbackURL

	fmt.Printf("[Worker Stateless] Starting transcoding for videoId: %s, key: %s\n", videoId, originalKey)
	payloadJson, _ := json.MarshalIndent(payload, "", "  ")
	fmt.Printf("[Worker Stateless] Received job payload:\n%s\n", string(payloadJson))

	reporter := NewProgressReporter(videoId, organizationId, callbackUrl)
	reporter.Report(0, "PROCESSING", true, nil)

	cwd, _ := os.Getwd()
	tempDir := filepath.Join(cwd, "temp", videoId)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}

	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	inputPath := filepath.Join(tempDir, "original.mp4")

	// 1. Download original file from S3/R2
	fmt.Printf("[Worker] Downloading source video: %s\n", originalKey)
	if err := DownloadFileFromS3(originalKey, inputPath, payload.S3); err != nil {
		errReport := map[string]interface{}{
			"videoId":        videoId,
			"organizationId": organizationId,
			"status":         "FAILED",
			"progress":       0,
			"error":          err.Error(),
		}
		reporter.Report(0, "FAILED", true, errReport)
		return nil, err
	}

	// 2. Probe video
	width, height, duration, err := ProbeVideo(inputPath)
	if err != nil {
		fmt.Printf("[Worker] Warning probing video: %v\n", err)
	}
	fmt.Printf("[Worker] Video probed: %dx%d, duration: %.0fs\n", width, height, duration)

	// Determine resolution ladder
	candidateRenditions := payload.Renditions
	if len(candidateRenditions) == 0 {
		candidateRenditions = ParseEnvRenditions()
	}

	// 3. Filter resolutions — NO UPSCALING (keep 480p fallback)
	var targetRenditions []RenditionConfig
	for _, r := range candidateRenditions {
		if r.Height <= height || r.Resolution == "480p" || r.Resolution == "480" {
			targetRenditions = append(targetRenditions, r)
		}
	}

	renditionNames := make([]string, len(targetRenditions))
	for i, r := range targetRenditions {
		renditionNames[i] = r.Resolution
	}
	fmt.Printf("[Worker] Generating renditions: %s\n", strings.Join(renditionNames, ", "))

	hlsOutputDir := filepath.Join(tempDir, "hls")
	_ = os.MkdirAll(hlsOutputDir, 0755)

	totalRenditions := len(targetRenditions)

	// 4. Transcode each rendition
	for i, rend := range targetRenditions {
		renditionDir := filepath.Join(hlsOutputDir, rend.Resolution)
		_ = os.MkdirAll(renditionDir, 0755)
		playlistPath := filepath.Join(renditionDir, "prog.m3u8")
		segmentPattern := filepath.Join(renditionDir, "seq_%03d.ts")

		fmt.Printf("[Worker] Encoding rendition %s (%d/%d)...\n", rend.Resolution, i+1, totalRenditions)

		vfFilter := fmt.Sprintf("scale=w=%d:h=%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2",
			rend.Width, rend.Height, rend.Width, rend.Height)

		maxRate := fmt.Sprintf("%dk", int(math.Round(float64(rend.BitrateKbps)*1.2)))
		bufSize := fmt.Sprintf("%dk", rend.BitrateKbps*2)
		bitrateStr := fmt.Sprintf("%dk", rend.BitrateKbps)

		args := []string{
			"-y",
			"-i", inputPath,
			"-vf", vfFilter,
			"-c:v", "libx264",
			"-b:v", bitrateStr,
			"-maxrate", maxRate,
			"-bufsize", bufSize,
			"-c:a", "aac",
			"-b:a", "128k",
			"-hls_time", "6",
			"-hls_playlist_type", "vod",
			"-hls_segment_filename", segmentPattern,
			"-progress", "pipe:1",
			playlistPath,
		}

		cmd := exec.Command("ffmpeg", args...)
		stdoutPipe, err := cmd.StdoutPipe()
		if err != nil {
			return nil, fmt.Errorf("ffmpeg pipe error: %w", err)
		}

		if err := cmd.Start(); err != nil {
			return nil, fmt.Errorf("ffmpeg start error: %w", err)
		}

		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "out_time=") || strings.HasPrefix(line, "time=") {
				parts := strings.Split(line, "=")
				if len(parts) == 2 {
					elapsed := ParseTimemarkToSeconds(strings.TrimSpace(parts[1]))
					renditionPercent := 0.0
					if duration > 0 {
						renditionPercent = (elapsed / duration) * 100.0
					}
					overallProgress := CalculateTranscodeProgress(i, totalRenditions, renditionPercent)
					reporter.Report(overallProgress, "PROCESSING", false, nil)
				}
			}
		}

		if err := cmd.Wait(); err != nil {
			errReport := map[string]interface{}{
				"videoId":        videoId,
				"organizationId": organizationId,
				"status":         "FAILED",
				"progress":       0,
				"error":          fmt.Sprintf("FFmpeg error for %s: %v", rend.Resolution, err),
			}
			reporter.Report(0, "FAILED", true, errReport)
			return nil, err
		}

		completedProgress := CalculateTranscodeProgress(i+1, totalRenditions, 100.0)
		reporter.Report(completedProgress, "PROCESSING", false, nil)
	}

	// 5. Generate Master Playlist
	masterContent := "#EXTM3U\n#EXT-X-VERSION:3\n"
	for _, rend := range targetRenditions {
		bandwidth := rend.BitrateKbps * 1000
		masterContent += fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d\n", bandwidth, rend.Width, rend.Height)
		masterContent += fmt.Sprintf("%s/prog.m3u8\n", rend.Resolution)
	}
	_ = os.WriteFile(filepath.Join(hlsOutputDir, "master.m3u8"), []byte(masterContent), 0644)

	// 6. Generate WebP Thumbnail
	rand.Seed(time.Now().UnixNano())
	unique := fmt.Sprintf("%d-%x", time.Now().UnixMilli(), rand.Intn(0xffffff))
	thumbFileName := fmt.Sprintf("thumbnail-%s.webp", unique)
	thumbnailPath := filepath.Join(tempDir, thumbFileName)

	seekTime := 0.0
	if duration > 0 {
		seekTime = math.Min(1.0, duration/2.0)
	}

	thumbArgs := []string{
		"-y",
		"-ss", fmt.Sprintf("%.2f", seekTime),
		"-i", inputPath,
		"-frames:v", "1",
		"-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
		"-c:v", "libwebp",
		"-quality", "82",
		thumbnailPath,
	}

	thumbCmd := exec.Command("ffmpeg", thumbArgs...)
	_ = thumbCmd.Run()

	// 7. Upload HLS structure & Thumbnail
	orgId := organizationId
	s3HlsPrefix := fmt.Sprintf("%s/%s/hls", orgId, videoId)
	s3ThumbKey := fmt.Sprintf("%s/%s/%s", orgId, videoId, thumbFileName)

	fmt.Printf("[Worker] Uploading HLS renditions to R2 under %s...\n", s3HlsPrefix)
	_ = UploadDirectoryToS3(hlsOutputDir, s3HlsPrefix, payload.S3, func(uploadRatio float64) {
		uploadProgress := CalculateUploadProgress(uploadRatio * 0.9)
		reporter.Report(uploadProgress, "PROCESSING", false, nil)
	})

	fmt.Printf("[Worker] Uploading thumbnail (%s) to R2...\n", thumbFileName)
	thumbnailUrl, err := UploadFileToS3(thumbnailPath, s3ThumbKey, "image/webp", payload.S3)
	if err != nil {
		fmt.Printf("[Worker Warning] Thumbnail upload error: %v\n", err)
	}
	_ = thumbnailUrl

	finalUploadProgress := CalculateUploadProgress(1.0)
	reporter.Report(finalUploadProgress, "PROCESSING", false, nil)

	// 8. Size calculation
	inputStat, _ := os.Stat(inputPath)
	originalSizeBytes := int64(0)
	if inputStat != nil {
		originalSizeBytes = inputStat.Size()
	}

	var renditionsResult []map[string]interface{}
	for _, r := range targetRenditions {
		rendDir := filepath.Join(hlsOutputDir, r.Resolution)
		rendSize := calculateDirSize(rendDir)
		renditionsResult = append(renditionsResult, map[string]interface{}{
			"resolution":  r.Resolution,
			"bitrateKbps": r.BitrateKbps,
			"storageKey":  fmt.Sprintf("%s/%s/prog.m3u8", s3HlsPrefix, r.Resolution),
			"sizeBytes":   rendSize,
		})
	}

	totalHlsSizeBytes := calculateDirSize(hlsOutputDir)
	combinedSizeBytes := originalSizeBytes + totalHlsSizeBytes

	fmt.Printf("[Worker] Size stats for %s: Original=%d B, HLS=%d B, Combined=%d B\n",
		videoId, originalSizeBytes, totalHlsSizeBytes, combinedSizeBytes)

	rawResultPayload := map[string]interface{}{
		"videoId":           videoId,
		"organizationId":    orgId,
		"status":            "READY",
		"progress":          100,
		"durationSeconds":   int(duration),
		"sourceWidth":       width,
		"sourceHeight":      height,
		"thumbnailUrl":      s3ThumbKey,
		"renditions":        renditionsResult,
		"originalSizeBytes": originalSizeBytes,
		"totalHlsSizeBytes": totalHlsSizeBytes,
		"combinedSizeBytes": combinedSizeBytes,
	}

	resultPayload := UseLocalhostForDockerHost(rawResultPayload).(map[string]interface{})

	fmt.Printf("[Worker] Transcoding complete for %s! Posting results to callback...\n", videoId)
	reporter.Report(100, "READY", true, resultPayload)

	return resultPayload, nil
}
