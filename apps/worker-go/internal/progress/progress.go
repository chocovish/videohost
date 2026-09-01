package progress

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"videohost-worker-go/internal/urlutils"
)

type ProgressReportPayload struct {
	VideoId        string         `json:"videoId"`
	OrganizationId string         `json:"organizationId,omitempty"`
	Status         string         `json:"status"` // PROCESSING | READY | FAILED
	Progress       int            `json:"progress"`
	Extra          map[string]any `json:"-"`
}

type ProgressCallback func(ctx context.Context, progress int) error

type ProgressReporter struct {
	videoId              string
	organizationId       string
	callbackUrl          string
	onProgress           ProgressCallback
	lastReportedProgress int
	lastReportedTime     time.Time
	minProgressDelta     int
	minTimeDelta         time.Duration
	isSending            bool
	mu                   sync.Mutex
	httpClient           *http.Client
}

func NewProgressReporter(videoId, organizationId, callbackUrl string, onProgress ...ProgressCallback) *ProgressReporter {
	if organizationId == "" {
		organizationId = "default"
	}
	var cb ProgressCallback
	if len(onProgress) > 0 {
		cb = onProgress[0]
	}
	return &ProgressReporter{
		videoId:              videoId,
		organizationId:       organizationId,
		callbackUrl:          callbackUrl,
		onProgress:           cb,
		lastReportedProgress: -1,
		lastReportedTime:     time.Time{},
		minProgressDelta:     5,
		minTimeDelta:         5 * time.Minute,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Report reports progress if forced, or if progress >= 5% delta, or if 5 minutes have elapsed, or on status change / 100%.
func (r *ProgressReporter) Report(ctx context.Context, currentProgress float64, status string, force bool, extraData map[string]any) error {
	r.mu.Lock()

	progress := int(math.Floor(currentProgress))
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}
	if status == "" {
		status = "PROCESSING"
	}

	now := time.Now()
	progressDelta := int(math.Abs(float64(progress - r.lastReportedProgress)))
	timeDelta := now.Sub(r.lastReportedTime)

	shouldReport := force ||
		r.lastReportedProgress == -1 ||
		progress == 100 ||
		status != "PROCESSING" ||
		progressDelta >= r.minProgressDelta ||
		timeDelta >= r.minTimeDelta

	if !shouldReport {
		r.mu.Unlock()
		return nil
	}

	if r.isSending && !force {
		r.mu.Unlock()
		return nil
	}

	r.lastReportedProgress = progress
	r.lastReportedTime = now
	r.isSending = true
	cb := r.onProgress
	r.mu.Unlock()

	defer func() {
		r.mu.Lock()
		r.isSending = false
		r.mu.Unlock()
	}()

	// Report progress to BullMQ / custom callback if provided
	if cb != nil {
		if err := cb(ctx, progress); err != nil {
			fmt.Printf("[ProgressReporter Error] BullMQ progress callback error for video %s: %v\n", r.videoId, err)
		}
	}

	if r.callbackUrl == "" {
		fmt.Printf("[ProgressReporter] videoId: %s progress: %d%% (No callbackUrl)\n", r.videoId, progress)
		return nil
	}

	// Prepare payload map
	payloadMap := make(map[string]any)
	for k, v := range extraData {
		payloadMap[k] = v
	}
	payloadMap["videoId"] = r.videoId
	payloadMap["organizationId"] = r.organizationId
	payloadMap["status"] = status
	payloadMap["progress"] = progress

	convertedPayload := urlutils.TransformJSONDockerHostToLocalhost(payloadMap)
	fmt.Printf("[ProgressReporter] Reporting progress %d%% for video %s (%s)\n", progress, r.videoId, status)

	bodyBytes, err := json.Marshal(convertedPayload)
	if err != nil {
		fmt.Printf("[ProgressReporter Error] JSON marshal error: %v\n", err)
		return err
	}

	// Prepare request
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.callbackUrl, bytes.NewReader(bodyBytes))
	if err != nil {
		fmt.Printf("[ProgressReporter Error] Failed to create request: %v\n", err)
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	workerSecret := strings.TrimSpace(os.Getenv("WORKER_SECRET_TOKEN"))
	if workerSecret != "" {
		req.Header.Set("Authorization", "Bearer "+workerSecret)
		req.Header.Set("x-worker-secret", workerSecret)
	}

	res, err := r.httpClient.Do(req)
	if err != nil {
		fmt.Printf("[ProgressReporter Error] Failed to post callback to %s: %v\n", r.callbackUrl, err)
		return err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		fmt.Printf("[ProgressReporter Error] HTTP %d from %s\n", res.StatusCode, r.callbackUrl)
	} else {
		fmt.Printf("[ProgressReporter] Successfully posted %d%% callback to %s\n", progress, r.callbackUrl)
	}

	return nil
}

// CalculateTranscodeProgress maps rendition transcode progress into 0-80% overall progress.
func CalculateTranscodeProgress(renditionIndex, totalRenditions int, renditionPercent float64) float64 {
	if totalRenditions <= 0 {
		return 80.0
	}
	clampedPercent := math.Min(100.0, math.Max(0.0, renditionPercent))
	completedWeight := (float64(renditionIndex) / float64(totalRenditions)) * 80.0
	currentWeight := (clampedPercent / 100.0) * (80.0 / float64(totalRenditions))
	return math.Min(80.0, completedWeight+currentWeight)
}

// CalculateUploadProgress maps upload progress (0.0 - 1.0) into 80-100% overall progress.
func CalculateUploadProgress(uploadRatio float64) float64 {
	clampedRatio := math.Min(1.0, math.Max(0.0, uploadRatio))
	return 80.0 + clampedRatio*20.0
}

// ParseTimemarkToSeconds parses "HH:MM:SS.ms", "MM:SS.ms", or numeric strings into seconds.
func ParseTimemarkToSeconds(timemark string) float64 {
	timemark = strings.TrimSpace(timemark)
	if timemark == "" {
		return 0
	}

	parts := strings.Split(timemark, ":")
	if len(parts) == 3 {
		h, _ := strconv.ParseFloat(parts[0], 64)
		m, _ := strconv.ParseFloat(parts[1], 64)
		s, _ := strconv.ParseFloat(parts[2], 64)
		return h*3600 + m*60 + s
	} else if len(parts) == 2 {
		m, _ := strconv.ParseFloat(parts[0], 64)
		s, _ := strconv.ParseFloat(parts[1], 64)
		return m*60 + s
	}

	val, _ := strconv.ParseFloat(timemark, 64)
	return val
}

