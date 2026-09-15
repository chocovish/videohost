package transcoder

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"videohost-worker-go/internal/progress"
	"videohost-worker-go/internal/s3"
	"videohost-worker-go/internal/urlutils"
)

// TranscriptionJobPayload mirrors the Node worker contract. Everything the
// worker needs is supplied per-job by the Next.js app — the worker holds no
// transcription config of its own (besides the shared WORKER_SECRET_TOKEN
// used to authenticate callbacks, same as transcodes).
//
//   - AudioHlsUrl: CDN link of the video's dedicated audio rendition .m3u8
//   - FallbackHlsUrl: optional CDN link of master.m3u8, tried when the audio
//     playlist fails (worker extracts the audio stream instead)
//   - WhisperUrl: Whisper server base URL (e.g. http://host:9000) — the
//     `/v1/audio/transcriptions` path is appended by the worker. A full legacy
//     endpoint ending in `/v1/audio/transcriptions` is still accepted.
//   - WhisperApiKey: bearer token sent as `Authorization: Bearer <key>`
//   - StorageKey: destination S3 key for the resulting .vtt file
//   - CallbackUrl: Next.js transcription-callback endpoint
type TranscriptionJobPayload struct {
	JobType         string             `json:"jobType,omitempty"`
	VideoId         string             `json:"videoId"`
	OrganizationId  string             `json:"organizationId"`
	AudioHlsUrl     string             `json:"audioHlsUrl,omitempty"`
	AudioUrl        string             `json:"audioUrl,omitempty"`
	FallbackHlsUrl  string             `json:"fallbackHlsUrl,omitempty"`
	MasterHlsUrl    string             `json:"masterHlsUrl,omitempty"`
	WhisperUrl      string             `json:"whisperUrl,omitempty"`
	WhisperApiUrl   string             `json:"whisperApiUrl,omitempty"`
	WhisperApiKey   string             `json:"whisperApiKey,omitempty"`
	WhisperAuthToken string            `json:"whisperAuthToken,omitempty"`
	WhisperLanguage string             `json:"whisperLanguage,omitempty"`
	WhisperModel    string             `json:"whisperModel,omitempty"`
	ResponseFormat  string             `json:"responseFormat,omitempty"`
	S3              *s3.S3ConfigContext `json:"s3,omitempty"`
	SubtitleId      string             `json:"subtitleId"`
	StorageKey      string             `json:"storageKey"`
	Language        string             `json:"language"`
	Label           string             `json:"label"`
	CallbackUrl     string             `json:"callbackUrl,omitempty"`
}

// TranscriptionQueueKey is the dedupe key for transcription jobs — one
// transcription per video at a time (separate namespace from transcodes).
func TranscriptionQueueKey(videoId string) string {
	return "transcription:" + videoId
}

// TranscriptionBullJobId is the BullMQ jobId for transcription jobs on the
// shared "video-transcode" queue (job name "transcribe").
func TranscriptionBullJobId(videoId string) string {
	return "transcribe-" + videoId
}

type activeTranscriptionEntry struct {
	cancel   context.CancelFunc
	cmd      *exec.Cmd
	mu       sync.Mutex
	payload  TranscriptionJobPayload
	reporter *progress.ProgressReporter
	done     chan struct{}
}

var activeTranscriptions sync.Map

// CancelActiveTranscription aborts the in-flight transcription for a video
// (kills the current ffmpeg process). Returns true if one was running.
func CancelActiveTranscription(videoId string) bool {
	val, ok := activeTranscriptions.Load(TranscriptionQueueKey(videoId))
	if !ok {
		return false
	}

	entry := val.(*activeTranscriptionEntry)
	fmt.Printf("[Worker Transcribe] Cancellation requested for video %s, killing ffmpeg...\n", videoId)

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

func IsTranscriptionActive(videoId string) bool {
	_, ok := activeTranscriptions.Load(TranscriptionQueueKey(videoId))
	return ok
}

func GetActiveTranscriptionIds() []string {
	var ids []string
	activeTranscriptions.Range(func(k, _ any) bool {
		ids = append(ids, k.(string))
		return true
	})
	return ids
}

func CancelAllActiveTranscriptions(timeout time.Duration) {
	var doneChannels []chan struct{}
	var ids []string

	activeTranscriptions.Range(func(k, v any) bool {
		ids = append(ids, k.(string))
		entry := v.(*activeTranscriptionEntry)
		entry.mu.Lock()
		if entry.cancel != nil {
			entry.cancel()
		}
		if entry.cmd != nil && entry.cmd.Process != nil {
			_ = entry.cmd.Process.Kill()
		}
		entry.mu.Unlock()
		doneChannels = append(doneChannels, entry.done)
		return true
	})

	if len(ids) == 0 {
		fmt.Println("[Worker Transcribe] SIGTERM cleanup: no active transcriptions")
		return
	}

	fmt.Printf("[Worker Transcribe] SIGTERM cleanup: cancelling %d active transcription(s): %s\n", len(ids), strings.Join(ids, ", "))

	allDone := make(chan struct{})
	go func() {
		for _, ch := range doneChannels {
			<-ch
		}
		close(allDone)
	}()

	select {
	case <-allDone:
		fmt.Println("[Worker Transcribe] SIGTERM cleanup: all active transcriptions finished cleanup")
	case <-time.After(timeout):
		fmt.Println("[Worker Transcribe] SIGTERM cleanup: timeout waiting for active transcriptions cleanup")
	}
}

func resolveTranscriptionAudioSource(p TranscriptionJobPayload) (primary, fallback string) {
	primary = strings.TrimSpace(p.AudioHlsUrl)
	if primary == "" {
		primary = strings.TrimSpace(p.AudioUrl)
	}
	fallback = strings.TrimSpace(p.FallbackHlsUrl)
	if fallback == "" {
		fallback = strings.TrimSpace(p.MasterHlsUrl)
	}
	return primary, fallback
}

func resolveTranscriptionWhisperURL(p TranscriptionJobPayload) string {
	raw := strings.TrimSpace(p.WhisperUrl)
	if raw == "" {
		raw = strings.TrimSpace(p.WhisperApiUrl)
	}
	raw = strings.TrimRight(raw, "/")
	if raw == "" {
		return ""
	}
	// Accept both a base URL (http://host:port) and the legacy full endpoint.
	// The transcription path is prepared here.
	lower := strings.ToLower(raw)
	if strings.HasSuffix(lower, "/v1/audio/transcriptions") {
		return raw
	}
	return raw + "/v1/audio/transcriptions"
}

func resolveTranscriptionWhisperKey(p TranscriptionJobPayload) string {
	raw := p.WhisperApiKey
	if strings.TrimSpace(raw) == "" {
		raw = p.WhisperAuthToken
	}
	raw = strings.TrimSpace(raw)
	// Accept callers that include the "Bearer " prefix already.
	if len(raw) > 7 && strings.EqualFold(raw[:7], "Bearer ") {
		raw = strings.TrimSpace(raw[7:])
	}
	return raw
}

func resolveTranscriptionResponseFormat(p TranscriptionJobPayload) string {
	// Callers may send padded values (e.g. "vtt   ") — always trim.
	cleaned := strings.ToLower(strings.TrimSpace(p.ResponseFormat))
	if cleaned == "" {
		return "vtt"
	}
	return cleaned
}

func isTranscriptionCancelledErr(err error) bool {
	return err != nil && (errors.Is(err, ErrJobCancelled) || errors.Is(err, context.Canceled))
}

// ProcessTranscriptionJob converts the audio rendition HLS playlist to a
// 16kHz mono WAV with ffmpeg, sends it to the Whisper-compatible endpoint
// from the payload, uploads the returned WebVTT to S3, and reports the
// result to the Next.js transcription-callback URL.
func ProcessTranscriptionJob(ctx context.Context, payload TranscriptionJobPayload, onProgress ...progress.ProgressCallback) (map[string]any, error) {
	videoId := payload.VideoId
	if videoId == "" {
		return nil, errors.New("videoId is required")
	}

	orgId := payload.OrganizationId
	if orgId == "" {
		orgId = "default"
	}
	payload.OrganizationId = orgId

	// Docker network translation for container-to-host calls.
	audioUrl, fallbackUrl := resolveTranscriptionAudioSource(payload)
	audioUrl = urlutils.UseDockerHostForLocalhost(audioUrl)
	fallbackUrl = urlutils.UseDockerHostForLocalhost(fallbackUrl)
	whisperUrl := urlutils.UseDockerHostForLocalhost(resolveTranscriptionWhisperURL(payload))
	whisperApiKey := resolveTranscriptionWhisperKey(payload)
	responseFormat := resolveTranscriptionResponseFormat(payload)
	payload.CallbackUrl = urlutils.UseDockerHostForLocalhost(payload.CallbackUrl)
	if payload.S3 != nil {
		payload.S3.Endpoint = urlutils.UseDockerHostForLocalhost(payload.S3.Endpoint)
	}

	fmt.Printf("[Worker Transcribe] Starting transcription for videoId: %s, subtitleId: %s\n", videoId, payload.SubtitleId)

	var missing []string
	if videoId == "" {
		missing = append(missing, "videoId")
	}
	if audioUrl == "" {
		missing = append(missing, "audioHlsUrl")
	}
	if whisperUrl == "" {
		missing = append(missing, "whisperUrl")
	}
	if whisperApiKey == "" {
		missing = append(missing, "whisperApiKey")
	}
	if payload.S3 == nil || strings.TrimSpace(payload.S3.Endpoint) == "" {
		missing = append(missing, "s3.endpoint")
	}
	if payload.S3 == nil || strings.TrimSpace(payload.S3.Bucket) == "" {
		missing = append(missing, "s3.bucket")
	}
	if strings.TrimSpace(payload.StorageKey) == "" {
		missing = append(missing, "storageKey")
	}
	if strings.TrimSpace(payload.SubtitleId) == "" {
		missing = append(missing, "subtitleId")
	}
	if strings.TrimSpace(payload.CallbackUrl) == "" {
		missing = append(missing, "callbackUrl")
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("transcription payload missing required field(s): %s", strings.Join(missing, ", "))
	}

	reporter := progress.NewProgressReporter(videoId, orgId, payload.CallbackUrl, onProgress...)
	_ = reporter.Report(ctx, 5, "PROCESSING", true, nil)

	queueKey := TranscriptionQueueKey(videoId)
	jobCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	doneChan := make(chan struct{})
	activeEntry := &activeTranscriptionEntry{
		cancel:   cancel,
		cmd:      nil,
		payload:  payload,
		reporter: reporter,
		done:     doneChan,
	}
	activeTranscriptions.Store(queueKey, activeEntry)
	defer func() {
		activeTranscriptions.Delete(queueKey)
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

	absTempDir, err := filepath.Abs(filepath.Join("temp", fmt.Sprintf("transcribe-%s-%s", videoId, payload.SubtitleId)))
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(absTempDir, 0755); err != nil {
		return nil, err
	}
	wavPath := filepath.Join(absTempDir, "audio.wav")
	vttPath := filepath.Join(absTempDir, "subtitles.vtt")
	uploadedVtt := false

	convertHlsToWav := func(sourceUrl string) error {
		fmt.Printf("[Worker Transcribe] Converting HLS to WAV (16kHz mono): %s\n", sourceUrl)
		cmd := exec.CommandContext(jobCtx, "ffmpeg",
			"-y",
			"-i", sourceUrl,
			"-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
			wavPath,
		)
		activeEntry.mu.Lock()
		activeEntry.cmd = cmd
		activeEntry.mu.Unlock()
		defer func() {
			activeEntry.mu.Lock()
			activeEntry.cmd = nil
			activeEntry.mu.Unlock()
		}()

		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			if isCancelled() {
				return ErrJobCancelled
			}
			out := strings.TrimSpace(stderr.String())
			if len(out) > 500 {
				out = out[len(out)-500:]
			}
			return fmt.Errorf("ffmpeg HLS->WAV conversion failed: %v — %s", err, out)
		}
		return nil
	}

	callWhisperAPI := func() (string, error) {
		wavBytes, err := os.ReadFile(wavPath)
		if err != nil {
			return "", fmt.Errorf("failed to read converted WAV: %w", err)
		}
		if len(wavBytes) == 0 {
			return "", errors.New("ffmpeg produced an empty WAV file — no audio could be extracted from the HLS playlist")
		}
		fmt.Printf("[Worker Transcribe] Sending %.2fMB WAV to Whisper API...\n", float64(len(wavBytes))/1024/1024)

		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		if err := writer.WriteField("response_format", responseFormat); err != nil {
			return "", err
		}
		if lang := strings.TrimSpace(payload.WhisperLanguage); lang != "" {
			if err := writer.WriteField("language", lang); err != nil {
				return "", err
			}
		}
		if model := strings.TrimSpace(payload.WhisperModel); model != "" {
			if err := writer.WriteField("model", model); err != nil {
				return "", err
			}
		}

		h := make(textproto.MIMEHeader)
		h.Set("Content-Disposition", `form-data; name="file"; filename="audio.wav"`)
		h.Set("Content-Type", "audio/wav")
		part, err := writer.CreatePart(h)
		if err != nil {
			return "", err
		}
		if _, err := part.Write(wavBytes); err != nil {
			return "", err
		}
		if err := writer.Close(); err != nil {
			return "", err
		}

		req, err := http.NewRequestWithContext(jobCtx, http.MethodPost, whisperUrl, &body)
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req.Header.Set("Authorization", "Bearer "+whisperApiKey)

		httpClient := &http.Client{}
		res, err := httpClient.Do(req)
		if err != nil {
			if isCancelled() {
				return "", ErrJobCancelled
			}
			return "", fmt.Errorf("failed to reach Whisper API at %s: %w", whisperUrl, err)
		}
		defer res.Body.Close()

		resBytes, _ := io.ReadAll(io.LimitReader(res.Body, 10*1024*1024))
		if res.StatusCode < 200 || res.StatusCode >= 300 {
			snippet := strings.TrimSpace(string(resBytes))
			if len(snippet) > 500 {
				snippet = snippet[:500]
			}
			if snippet == "" {
				snippet = res.Status
			}
			return "", fmt.Errorf("whisper API error (HTTP %d): %s", res.StatusCode, snippet)
		}

		text := string(resBytes)
		if strings.TrimSpace(text) == "" {
			return "", errors.New("whisper API returned an empty transcription")
		}
		return text, nil
	}

	fail := func(jobErr error) (map[string]any, error) {
		if isTranscriptionCancelledErr(jobErr) || isCancelled() {
			fmt.Printf("[Worker Transcribe] Transcription job for video %s was cancelled — cleaning up S3 and reporting CANCELLED\n", videoId)
			if uploadedVtt && payload.S3 != nil {
				if err := s3.DeleteS3Object(ctx, payload.StorageKey, payload.S3); err != nil {
					fmt.Printf("[Worker Transcribe] Failed to cleanup S3 subtitle for cancelled video %s: %v\n", videoId, err)
				} else {
					fmt.Printf("[Worker Transcribe] Cleaned up S3 subtitle object for cancelled video %s\n", videoId)
				}
			}
			_ = reporter.Report(ctx, 0, "CANCELLED", true, map[string]any{
				"videoId":        videoId,
				"organizationId": orgId,
				"subtitleId":     payload.SubtitleId,
				"storageKey":     payload.StorageKey,
				"status":         "CANCELLED",
				"progress":       0,
				"error":          "Transcription cancelled (worker shutdown or user cancelled)",
			})
			return nil, ErrJobCancelled
		}

		fmt.Printf("[Worker Transcribe] Error transcribing video %s: %v\n", videoId, jobErr)
		_ = reporter.Report(ctx, 0, "FAILED", true, map[string]any{
			"videoId":        videoId,
			"organizationId": orgId,
			"subtitleId":     payload.SubtitleId,
			"storageKey":     payload.StorageKey,
			"status":         "FAILED",
			"progress":       0,
			"error":          jobErr.Error(),
		})
		return nil, jobErr
	}

	defer func() {
		if err := os.RemoveAll(absTempDir); err != nil {
			fmt.Printf("[Worker Transcribe] Warning: Failed to clean up temp dir %s: %v\n", absTempDir, err)
		} else {
			fmt.Printf("[Worker Transcribe] Cleaned up temp directory: %s\n", absTempDir)
		}
	}()

	// 1. Convert the audio rendition HLS playlist to WAV.
	if err := convertHlsToWav(audioUrl); err != nil {
		if isTranscriptionCancelledErr(err) || isCancelled() {
			return fail(err)
		}
		if fallbackUrl == "" {
			return fail(err)
		}
		fmt.Printf("[Worker Transcribe] Audio playlist failed (%v), retrying with fallback playlist...\n", err)
		if err := convertHlsToWav(fallbackUrl); err != nil {
			return fail(err)
		}
	}

	_ = reporter.Report(ctx, 35, "PROCESSING", true, nil)

	// 2. Transcribe via Whisper-compatible API (expects VTT back).
	vttText, err := callWhisperAPI()
	if err != nil {
		return fail(err)
	}

	firstLine := strings.TrimSpace(strings.SplitN(strings.TrimLeft(vttText, "\uFEFF \t\r\n"), "\n", 2)[0])
	if !strings.HasPrefix(strings.ToUpper(firstLine), "WEBVTT") {
		return fail(errors.New("whisper API did not return WebVTT content (response must start with WEBVTT)"))
	}

	_ = reporter.Report(ctx, 65, "PROCESSING", true, nil)

	// 3. Upload the VTT to S3.
	if err := os.WriteFile(vttPath, []byte(vttText), 0644); err != nil {
		return fail(err)
	}
	fmt.Printf("[Worker Transcribe] Uploading VTT to S3: %s\n", payload.StorageKey)
	if _, err := s3.UploadFileToS3(ctx, vttPath, payload.StorageKey, "text/vtt", payload.S3); err != nil {
		if isCancelled() {
			return fail(ErrJobCancelled)
		}
		return fail(fmt.Errorf("failed to upload VTT to S3: %w", err))
	}
	uploadedVtt = true

	_ = reporter.Report(ctx, 90, "PROCESSING", true, nil)

	language := strings.TrimSpace(payload.Language)
	if language == "" {
		language = "en"
	}
	// Auto-generated tracks carry the language code in the name.
	label := strings.TrimSpace(payload.Label)
	if label == "" {
		label = fmt.Sprintf("Auto-generated (%s)", language)
	}

	result := map[string]any{
		"videoId":        videoId,
		"organizationId": orgId,
		"subtitleId":     payload.SubtitleId,
		"storageKey":     payload.StorageKey,
		"language":       language,
		"label":          label,
		"status":         "READY",
		"progress":       100,
		"sizeBytes":      len([]byte(vttText)),
	}

	fmt.Printf("[Worker Transcribe] Transcription complete for %s! Posting results to callback...\n", videoId)
	converted := urlutils.TransformJSONDockerHostToLocalhost(result)
	extra, _ := converted.(map[string]any)
	if extra == nil {
		extra = result
	}
	_ = reporter.Report(ctx, 100, "READY", true, extra)

	return result, nil
}
