package transcoder

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os/exec"
	"strconv"
)

type ProbeMetadata struct {
	Width    int
	Height   int
	Duration int
	HasAudio bool
	SAR      string
}

type ffprobeOutput struct {
	Streams []struct {
		CodecType         string `json:"codec_type"`
		Width             int    `json:"width"`
		Height            int    `json:"height"`
		SampleAspectRatio string `json:"sample_aspect_ratio"`
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

