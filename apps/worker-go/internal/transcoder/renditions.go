package transcoder

import (
	"fmt"
	"math"
	"sort"
)

type RenditionConfig struct {
	Resolution  string `json:"resolution"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	BitrateKbps int    `json:"bitrateKbps"`
}

var DefaultResolutionLadder = []RenditionConfig{
	{Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
	{Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
	{Resolution: "1080p", Width: 1920, Height: 1080, BitrateKbps: 5500},
	{Resolution: "1440p", Width: 2560, Height: 1440, BitrateKbps: 9000},
	{Resolution: "4k", Width: 3840, Height: 2160, BitrateKbps: 18000},
}

func BitrateForHeight(height int) int {
	if height <= 360 {
		return 800
	}
	if height <= 480 {
		return 1000
	}
	if height <= 720 {
		return 3000
	}
	if height <= 1080 {
		return 5500
	}
	if height <= 1440 {
		return 9000
	}
	return 18000
}

func makeEven(val float64) int {
	rounded := int(math.Round(val))
	if rounded%2 != 0 {
		return rounded + 1
	}
	return rounded
}

// SelectTargetRenditions chooses ladder rungs <= source height, never upscaling, and adds native resolution if gap >= minNativeGapPx.
func SelectTargetRenditions(candidates []RenditionConfig, sourceWidth, sourceHeight int, minNativeGapPx int) []RenditionConfig {
	if minNativeGapPx <= 0 {
		minNativeGapPx = 100
	}

	sorted := make([]RenditionConfig, len(candidates))
	copy(sorted, candidates)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Height < sorted[j].Height
	})

	if len(sorted) == 0 {
		return []RenditionConfig{}
	}

	aspectRatio := 16.0 / 9.0
	if sourceWidth > 0 && sourceHeight > 0 {
		aspectRatio = float64(sourceWidth) / float64(sourceHeight)
	}

	var allowed []RenditionConfig
	for _, r := range sorted {
		if r.Height <= sourceHeight {
			allowed = append(allowed, RenditionConfig{
				Resolution:  r.Resolution,
				Width:       makeEven(float64(r.Height) * aspectRatio),
				Height:      r.Height,
				BitrateKbps: r.BitrateKbps,
			})
		}
	}

	if len(allowed) == 0 {
		fallback := sorted[0]
		return []RenditionConfig{
			{
				Resolution:  fallback.Resolution,
				Width:       makeEven(float64(fallback.Height) * aspectRatio),
				Height:      fallback.Height,
				BitrateKbps: fallback.BitrateKbps,
			},
		}
	}

	largest := allowed[len(allowed)-1]
	nativeGap := sourceHeight - largest.Height

	if nativeGap >= minNativeGapPx {
		width := makeEven(float64(sourceWidth))
		height := sourceHeight
		if height%2 != 0 {
			height -= 1
		}

		alreadyExists := false
		for _, r := range allowed {
			if r.Height == height {
				alreadyExists = true
				break
			}
		}

		if !alreadyExists {
			allowed = append(allowed, RenditionConfig{
				Resolution:  fmt.Sprintf("%dp", height),
				Width:       width,
				Height:      height,
				BitrateKbps: BitrateForHeight(height),
			})
		}
	}

	return allowed
}
