package transcoder

import (
	"strings"
	"testing"
)

func TestTranscriptionQueueKey(t *testing.T) {
	key := TranscriptionQueueKey("vid-123")
	if key == "vid-123" {
		t.Fatalf("transcription dedupe key must not collide with the transcode videoId key, got %q", key)
	}
	if !strings.Contains(key, "vid-123") {
		t.Fatalf("dedupe key must contain the videoId, got %q", key)
	}
	if TranscriptionBullJobId("vid-123") == "vid-123" {
		t.Fatalf("bull job id must not collide with the transcode jobId, got %q", TranscriptionBullJobId("vid-123"))
	}
}

func TestIsTranscriptionPayload(t *testing.T) {
	transcribe := TranscodeJobPayload{VideoId: "v1", JobType: "transcription"}
	if !transcribe.IsTranscriptionPayload() {
		t.Fatalf("payload with jobType=transcription must be detected as transcription")
	}

	whisperOnly := TranscodeJobPayload{VideoId: "v1", WhisperUrl: "http://localhost:9000/v1/audio/transcriptions"}
	if !whisperOnly.IsTranscriptionPayload() {
		t.Fatalf("payload with whisperUrl must be detected as transcription")
	}

	transcode := TranscodeJobPayload{VideoId: "v1", OriginalKey: "videos/o/v1/original.mp4"}
	if transcode.IsTranscriptionPayload() {
		t.Fatalf("plain transcode payload must not be detected as transcription")
	}
}

func TestToTranscriptionPayload(t *testing.T) {
	in := TranscodeJobPayload{
		VideoId:        "v1",
		OrganizationId: "org-1",
		JobType:        "transcription",
		AudioHlsUrl:    "https://cdn.example.com/b/videos/org-1/v1/dash/media_2.m3u8",
		WhisperUrl:     "http://localhost:9000/v1/audio/transcriptions",
		WhisperApiKey:  "secret",
		SubtitleId:     "sub-1",
		StorageKey:     "videos/org-1/v1/subtitles/sub-1-en.vtt",
		Language:       "en",
		Label:          "Auto-generated",
		CallbackUrl:    "http://localhost:3000/api/v1/videos/transcription-callback",
	}

	out := in.ToTranscriptionPayload()
	if out.VideoId != "v1" || out.OrganizationId != "org-1" {
		t.Fatalf("identity fields not carried over: %+v", out)
	}
	if out.AudioHlsUrl != in.AudioHlsUrl || out.WhisperUrl != in.WhisperUrl || out.WhisperApiKey != "secret" {
		t.Fatalf("whisper/audio fields not carried over: %+v", out)
	}
	if out.SubtitleId != "sub-1" || out.StorageKey != in.StorageKey {
		t.Fatalf("subtitle fields not carried over: %+v", out)
	}
	if out.CallbackUrl != in.CallbackUrl {
		t.Fatalf("callback not carried over: %+v", out)
	}
}
