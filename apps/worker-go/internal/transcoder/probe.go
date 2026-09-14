package transcoder

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os/exec"
	"strconv"
	"strings"
)

type ProbeMetadata struct {
	Width    int
	Height   int
	Duration int
	HasAudio bool
	SAR      string
	FPS      float64
}

func parseFPS(s string) float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "0/0" {
		return 0
	}
	parts := strings.Split(s, "/")
	if len(parts) == 2 {
		num, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
		den, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
		if err1 == nil && err2 == nil && den != 0 {
			return num / den
		}
		return 0
	}
	if v, err := strconv.ParseFloat(s, 64); err == nil {
		return v
	}
	return 0
}

// OutputFPS maps a probed source fps to the CFR we encode at:
// >=60 -> 60, anything else (including unknown) -> 30.
func OutputFPS(sourceFPS float64) int {
	if sourceFPS >= 60 {
		return 60
	}
	return 30
}

type ffprobeOutput struct {
	Streams []struct {
		CodecType         string `json:"codec_type"`
		Width             int    `json:"width"`
		Height            int    `json:"height"`
		SampleAspectRatio string `json:"sample_aspect_ratio"`
		AvgFrameRate      string `json:"avg_frame_rate"`
		RFrameRate        string `json:"r_frame_rate"`
	} `json:"streams"`
	Format struct {
		Duration string `json:"duration"`
	} `json:"format"`
}

func ProbeVideo(ctx context.Context, filePath string) (*ProbeMetadata, error) {
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe execution failed for %s: %w", filePath, err)
	}

	var data ffprobeOutput
	if err := json.Unmarshal(output, &data); err != nil {
		return nil, fmt.Errorf("failed to parse ffprobe json output: %w", err)
	}

	meta := &ProbeMetadata{
		Width:    1280,
		Height:   720,
		Duration: 0,
		HasAudio: false,
		SAR:      "1:1",
	}

	for _, stream := range data.Streams {
		if stream.CodecType == "video" {
			if stream.Width > 0 {
				meta.Width = stream.Width
			}
			if stream.Height > 0 {
				meta.Height = stream.Height
			}
			if stream.SampleAspectRatio != "" && stream.SampleAspectRatio != "0:1" {
				meta.SAR = stream.SampleAspectRatio
			}
			// Cheap fps: reuse the same ffprobe output, no extra pass.
			// Prefer avg_frame_rate, fall back to r_frame_rate, else 0 (=30 later).
			if meta.FPS <= 0 {
				meta.FPS = parseFPS(stream.AvgFrameRate)
			}
			if meta.FPS <= 0 {
				meta.FPS = parseFPS(stream.RFrameRate)
			}
		} else if stream.CodecType == "audio" {
			meta.HasAudio = true
		}
	}

	if data.Format.Duration != "" {
		if durFloat, err := strconv.ParseFloat(data.Format.Duration, 64); err == nil {
			meta.Duration = int(math.Round(durFloat))
		}
	}

	return meta, nil
}

