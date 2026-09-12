package transcoder

import (
	"encoding/json"
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

	// 900p source with 480/720/1080 ladder -> 480p + 720p only.
	// No extra native rung is added even though the gap above 720p is 180px.
	selected900 := SelectTargetRenditions(candidates, 1600, 900, 100)
	if len(selected900) != 2 {
		t.Fatalf("expected 2 renditions for 900p (no native rung), got %d", len(selected900))
	}

	// 4K source with only 1080p requested -> only 1080p (no 4K extra rung)
	single1080 := SelectTargetRenditions(candidates[:3], 3840, 2160, 100)
	for _, r := range single1080 {
		if r.Height > 1080 {
			t.Errorf("unexpected beyond-ladder rendition for capped 1080p request: %+v", r)
		}
	}
	if len(single1080) != 3 {
		t.Fatalf("expected 3 renditions (480/720/1080) for 4K source with 1080-capped ladder, got %d", len(single1080))
	}

	// Source smaller than smallest rung -> single source-height rendition, no upscale
	tiny := SelectTargetRenditions(candidates, 320, 240, 100)
	if len(tiny) != 1 {
		t.Fatalf("expected 1 rendition for 240p source, got %d", len(tiny))
	}
	if tiny[0].Height != 240 {
		t.Errorf("expected 240p source-height rendition, got %+v", tiny[0])
	}
}

func TestFlexIntAndStreamingSegments(t *testing.T) {
	cases := []struct {
		jsonStr  string
		expected int
	}{
		{`{"streamingSegments": 6}`, 6},
		{`{"streamingSegments": "6"}`, 6},
		{`{"streamingSegments": "0"}`, 0},
		{`{"hlsSegments": 8}`, 8},
		{`{"hlsSegments": "10"}`, 10},
		{`{"streamingSegments": 0, "hlsSegments": 6}`, 6},
		{`{}`, 0},
	}

	for _, c := range cases {
		var p TranscodeJobPayload
		if err := json.Unmarshal([]byte(c.jsonStr), &p); err != nil {
			t.Fatalf("Unmarshal(%s) error: %v", c.jsonStr, err)
		}
		val := int(p.StreamingSegments)
		if val <= 0 && int(p.HlsSegments) > 0 {
			val = int(p.HlsSegments)
		}
		if val != c.expected {
			t.Errorf("Unmarshal(%s) = %d; want %d", c.jsonStr, val, c.expected)
		}
	}
}


