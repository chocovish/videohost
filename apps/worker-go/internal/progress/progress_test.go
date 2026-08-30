package progress

import (
	"math"
	"testing"
)

func TestParseTimemarkToSeconds(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
	}{
		{"00:01:30.50", 90.5},
		{"01:00:00", 3600.0},
		{"05:30", 330.0},
		{"45.2", 45.2},
		{"", 0},
	}

	for _, tc := range tests {
		got := ParseTimemarkToSeconds(tc.input)
		if math.Abs(got-tc.expected) > 0.001 {
			t.Errorf("ParseTimemarkToSeconds(%q) = %v; want %v", tc.input, got, tc.expected)
		}
	}
}

func TestProgressCalculations(t *testing.T) {
	// Transcode progress: 0 of 2 renditions at 50% => 0 + (50/100)*(80/2) = 20%
	tp := CalculateTranscodeProgress(0, 2, 50)
	if math.Abs(tp-20.0) > 0.001 {
		t.Errorf("CalculateTranscodeProgress(0, 2, 50) = %v; want 20", tp)
	}

	// 1 of 2 renditions complete at 0% => (1/2)*80 + 0 = 40%
	tp2 := CalculateTranscodeProgress(1, 2, 0)
	if math.Abs(tp2-40.0) > 0.001 {
		t.Errorf("CalculateTranscodeProgress(1, 2, 0) = %v; want 40", tp2)
	}

	// Upload progress: 0% upload => 80%
	up0 := CalculateUploadProgress(0.0)
	if math.Abs(up0-80.0) > 0.001 {
		t.Errorf("CalculateUploadProgress(0.0) = %v; want 80", up0)
	}

	// Upload progress: 50% upload => 90%
	up50 := CalculateUploadProgress(0.5)
	if math.Abs(up50-90.0) > 0.001 {
		t.Errorf("CalculateUploadProgress(0.5) = %v; want 90", up50)
	}

	// Upload progress: 100% upload => 100%
	up100 := CalculateUploadProgress(1.0)
	if math.Abs(up100-100.0) > 0.001 {
		t.Errorf("CalculateUploadProgress(1.0) = %v; want 100", up100)
	}
}

