package progress

import (
	"context"
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

func TestProgressReporterCallback(t *testing.T) {
	var reportedProgress []int
	cb := func(ctx context.Context, p int) error {
		reportedProgress = append(reportedProgress, p)
		return nil
	}

	reporter := NewProgressReporter("test-vid-1", "test-org", "", cb)

	// 1. Initial 0% forced report
	if err := reporter.Report(context.Background(), 0, "PROCESSING", true, nil); err != nil {
		t.Fatalf("unexpected error reporting initial progress: %v", err)
	}

	// 2. Incremental 2% progress (below minProgressDelta of 5%) -> should not report
	if err := reporter.Report(context.Background(), 2, "PROCESSING", false, nil); err != nil {
		t.Fatalf("unexpected error reporting progress: %v", err)
	}

	// 3. Incremental 50% progress (above delta) -> should report
	if err := reporter.Report(context.Background(), 50, "PROCESSING", false, nil); err != nil {
		t.Fatalf("unexpected error reporting progress: %v", err)
	}

	// 4. Final 100% READY progress (forced) -> should report
	if err := reporter.Report(context.Background(), 100, "READY", true, nil); err != nil {
		t.Fatalf("unexpected error reporting final progress: %v", err)
	}

	expected := []int{0, 50, 100}
	if len(reportedProgress) != len(expected) {
		t.Fatalf("expected %d progress reports, got %d: %+v", len(expected), len(reportedProgress), reportedProgress)
	}
	for i, v := range expected {
		if reportedProgress[i] != v {
			t.Errorf("reportedProgress[%d] = %d; want %d", i, reportedProgress[i], v)
		}
	}
}

