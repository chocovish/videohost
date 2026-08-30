package transcoder

import (
	"testing"
)

func TestAspectAndGCD(t *testing.T) {
	if g := GCD(1920, 1080); g != 120 {
		t.Errorf("GCD(1920, 1080) = %d; want 120", g)
	}

	dar := ComputeTargetDAR(1920, 1080, "1:1")
	if dar.DarNum != 16 || dar.DarDen != 9 {
		t.Errorf("ComputeTargetDAR(1920, 1080, 1:1) = %d/%d; want 16/9", dar.DarNum, dar.DarDen)
	}

	sar := ComputeRenditionSAR(1280, 720, dar.DarNum, dar.DarDen)
	if sar != "1/1" {
		t.Errorf("ComputeRenditionSAR(1280, 720, 16, 9) = %s; want 1/1", sar)
	}
}

func TestSelectTargetRenditions(t *testing.T) {
	candidates := []RenditionConfig{
		{Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
		{Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
		{Resolution: "1080p", Width: 1920, Height: 1080, BitrateKbps: 5500},
	}

	// 1080p source -> all 3 renditions selected, no native gap needed
	selected1080 := SelectTargetRenditions(candidates, 1920, 1080, 100)
	if len(selected1080) != 3 {
		t.Fatalf("expected 3 renditions for 1080p, got %d", len(selected1080))
	}

	// 720p source -> 480p and 720p selected, 1080p filtered out (no upscaling)
	selected720 := SelectTargetRenditions(candidates, 1280, 720, 100)
	if len(selected720) != 2 {
		t.Fatalf("expected 2 renditions for 720p, got %d", len(selected720))
	}
	if selected720[0].Resolution != "480p" || selected720[1].Resolution != "720p" {
		t.Errorf("unexpected resolutions: %+v", selected720)
	}

	// 900p source (gap of 180px above 720p) -> 480p, 720p, plus native 900p rung
	selected900 := SelectTargetRenditions(candidates, 1600, 900, 100)
	if len(selected900) != 3 {
		t.Fatalf("expected 3 renditions for 900p with native rung, got %d", len(selected900))
	}
	if selected900[2].Resolution != "900p" || selected900[2].Height != 900 {
		t.Errorf("expected native 900p rung as 3rd rendition, got %+v", selected900[2])
	}
}

