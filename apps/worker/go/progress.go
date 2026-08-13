package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ProgressReporter struct {
	videoId              string
	organizationId       string
	callbackUrl          string
	lastReportedProgress int
	lastReportedTime     time.Time
	minProgressDelta     int
	minTimeDelta         time.Duration
	isSending            bool
	mu                   sync.Mutex
}

func NewProgressReporter(videoId, organizationId, callbackUrl string) *ProgressReporter {
	if organizationId == "" {
		organizationId = "default"
	}
	return &ProgressReporter{
		videoId:              videoId,
		organizationId:       organizationId,
		callbackUrl:          callbackUrl,
		lastReportedProgress: -1,
		minProgressDelta:     5,
		minTimeDelta:         5 * time.Minute,
	}
}

func (pr *ProgressReporter) Report(currentProgress float64, status string, force bool, extraData map[string]interface{}) {
	pr.mu.Lock()

	if status == "" {
		status = "PROCESSING"
	}

	progress := int(math.Min(100, math.Max(0, math.Floor(currentProgress))))
	now := time.Now()

	progressDelta := int(math.Abs(float64(progress - pr.lastReportedProgress)))
	timeDelta := now.Sub(pr.lastReportedTime)

	shouldReport := force ||
		pr.lastReportedProgress == -1 ||
		progress == 100 ||
		status != "PROCESSING" ||
		progressDelta >= pr.minProgressDelta ||
		timeDelta >= pr.minTimeDelta

	if !shouldReport {
		pr.mu.Unlock()
		return
	}
	if pr.isSending && !force {
		pr.mu.Unlock()
		return
	}

	pr.lastReportedProgress = progress
	pr.lastReportedTime = now
	pr.isSending = true
	pr.mu.Unlock()

	defer func() {
		pr.mu.Lock()
		pr.isSending = false
		pr.mu.Unlock()
	}()

	if pr.callbackUrl == "" {
		fmt.Printf("[ProgressReporter] videoId: %s progress: %d%% (No callbackUrl)\n", pr.videoId, progress)
		return
	}

	payload := map[string]interface{}{
		"videoId":        pr.videoId,
		"organizationId": pr.organizationId,
		"status":         status,
		"progress":       progress,
	}
	if extraData != nil {
		for k, v := range extraData {
			payload[k] = v
		}
	}

	convertedPayload := UseLocalhostForDockerHost(payload)
	targetCallbackUrl := ReplaceLocalhost(pr.callbackUrl)

	fmt.Printf("[ProgressReporter] Reporting progress %d%% for video %s (%s)\n", progress, pr.videoId, status)

	bodyBytes, err := json.Marshal(convertedPayload)
	if err != nil {
		fmt.Printf("[ProgressReporter Error] Failed to marshal JSON payload: %v\n", err)
		return
	}

	req, err := http.NewRequest("POST", targetCallbackUrl, bytes.NewBuffer(bodyBytes))
	if err != nil {
		fmt.Printf("[ProgressReporter Error] Failed to create HTTP request: %v\n", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	workerSecret := getEnvString(os.Getenv("WORKER_SECRET_TOKEN"))
	if workerSecret != "" {
		req.Header.Set("Authorization", "Bearer "+workerSecret)
		req.Header.Set("x-worker-secret", workerSecret)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[ProgressReporter Error] Failed to post callback to %s: %v\n", targetCallbackUrl, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		errorText, _ := io.ReadAll(resp.Body)
		fmt.Printf("[ProgressReporter Error] HTTP %d from %s: %s\n", resp.StatusCode, targetCallbackUrl, string(errorText))
	} else {
		fmt.Printf("[ProgressReporter] Successfully posted %d%% callback to %s\n", progress, targetCallbackUrl)
	}
}

func CalculateTranscodeProgress(renditionIndex, totalRenditions int, renditionPercent float64) float64 {
	if totalRenditions <= 0 {
		return 80.0
	}
	clampedPercent := math.Min(100.0, math.Max(0.0, renditionPercent))
	completedWeight := (float64(renditionIndex) / float64(totalRenditions)) * 80.0
	currentWeight := (clampedPercent / 100.0) * (80.0 / float64(totalRenditions))
	return math.Min(80.0, completedWeight+currentWeight)
}

func CalculateUploadProgress(uploadRatio float64) float64 {
	clampedRatio := math.Min(1.0, math.Max(0.0, uploadRatio))
	return 80.0 + (clampedRatio * 20.0)
}

func ParseTimemarkToSeconds(timemark string) float64 {
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
	s, _ := strconv.ParseFloat(timemark, 64)
	return s
}
