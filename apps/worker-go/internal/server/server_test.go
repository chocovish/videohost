package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"videohost-worker-go/internal/config"
	"videohost-worker-go/internal/jobqueue"
)

func TestServerHealthAndStats(t *testing.T) {
	cfg := &config.Config{
		Port:              8080,
		WorkerSecretToken: "test-secret-123",
	}
	queue := jobqueue.NewJobQueue(2)
	srv := NewServer(cfg, queue)

	// Test GET /health
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var healthRes map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &healthRes); err != nil {
		t.Fatalf("failed to decode JSON response: %v", err)
	}
	if healthRes["status"] != "ok" || healthRes["service"] != "videohost-transcoder" {
		t.Fatalf("unexpected health response: %+v", healthRes)
	}

	// Test GET /stats
	reqStats := httptest.NewRequest(http.MethodGet, "/stats", nil)
	recStats := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(recStats, reqStats)

	if recStats.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recStats.Code)
	}

	var statsRes map[string]any
	if err := json.Unmarshal(recStats.Body.Bytes(), &statsRes); err != nil {
		t.Fatalf("failed to decode stats JSON: %v", err)
	}
	if statsRes["queue"] == nil {
		t.Fatalf("missing queue in stats response: %+v", statsRes)
	}
}

func TestServerAuthAndValidation(t *testing.T) {
	cfg := &config.Config{
		Port:              8080,
		WorkerSecretToken: "secret-abc",
	}
	queue := jobqueue.NewJobQueue(2)
	srv := NewServer(cfg, queue)

	// 1. Unauthorized request
	body := bytes.NewBufferString(`{"videoId": "test-123"}`)
	req := httptest.NewRequest(http.MethodPost, "/transcode", body)
	rec := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized without token, got %d", rec.Code)
	}

	// 2. Authorized request but missing videoId
	emptyBody := bytes.NewBufferString(`{}`)
	req2 := httptest.NewRequest(http.MethodPost, "/transcode", emptyBody)
	req2.Header.Set("Authorization", "Bearer secret-abc")
	rec2 := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for missing videoId, got %d", rec2.Code)
	}

	// 3. Authorized valid transcode request
	validBody := bytes.NewBufferString(`{"videoId": "test-vid-99", "originalKey": "org/test-vid-99/original.mp4"}`)
	req3 := httptest.NewRequest(http.MethodPost, "/transcode", validBody)
	req3.Header.Set("x-worker-secret", "secret-abc")
	rec3 := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec3, req3)

	if rec3.Code != http.StatusAccepted {
		t.Fatalf("expected 202 Accepted for valid job, got %d", rec3.Code)
	}

	var acceptRes map[string]any
	if err := json.Unmarshal(rec3.Body.Bytes(), &acceptRes); err != nil {
		t.Fatalf("failed decoding accept JSON: %v", err)
	}
	if acceptRes["status"] != "ACCEPTED" {
		t.Fatalf("expected status ACCEPTED, got %v", acceptRes["status"])
	}
}

func TestServerTranscribeValidation(t *testing.T) {
	cfg := &config.Config{
		Port:              8080,
		WorkerSecretToken: "secret-abc",
	}
	queue := jobqueue.NewJobQueue(2)
	srv := NewServer(cfg, queue)

	// 1. Unauthorized request
	body := bytes.NewBufferString(`{"videoId": "test-123"}`)
	req := httptest.NewRequest(http.MethodPost, "/transcribe", body)
	rec := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized without token, got %d", rec.Code)
	}

	// 2. Authorized request but missing videoId
	emptyBody := bytes.NewBufferString(`{}`)
	req2 := httptest.NewRequest(http.MethodPost, "/transcribe", emptyBody)
	req2.Header.Set("Authorization", "Bearer secret-abc")
	rec2 := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for missing videoId, got %d", rec2.Code)
	}

	// 3. Authorized request missing transcription fields
	partialBody := bytes.NewBufferString(`{"videoId": "test-vid-1"}`)
	req3 := httptest.NewRequest(http.MethodPost, "/transcribe", partialBody)
	req3.Header.Set("x-worker-secret", "secret-abc")
	rec3 := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec3, req3)

	if rec3.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for incomplete transcription payload, got %d", rec3.Code)
	}
	var missingRes map[string]any
	if err := json.Unmarshal(rec3.Body.Bytes(), &missingRes); err != nil {
		t.Fatalf("failed decoding missing-fields JSON: %v", err)
	}
	if missingRes["error"] == nil {
		t.Fatalf("expected error detail for missing fields, got %v", missingRes)
	}

	// 4. Authorized valid transcribe request (accepted; background job fails
	// harmlessly against unreachable URLs — only the accept path is asserted)
	validBody := bytes.NewBufferString(`{
		"videoId": "test-transcribe-99",
		"organizationId": "org-1",
		"audioHlsUrl": "http://localhost:9/videos/org-1/test-transcribe-99/dash/media_0.m3u8",
		"whisperUrl": "http://localhost:9/v1/audio/transcriptions",
		"whisperApiKey": "key-123",
		"s3": {"endpoint": "http://localhost:9000", "bucket": "videohost"},
		"subtitleId": "sub-1",
		"storageKey": "videos/org-1/test-transcribe-99/subtitles/sub-1-en.vtt",
		"language": "en",
		"label": "Auto-generated",
		"callbackUrl": "http://localhost:9/api/v1/videos/transcription-callback"
	}`)
	req4 := httptest.NewRequest(http.MethodPost, "/transcribe", validBody)
	req4.Header.Set("Authorization", "Bearer secret-abc")
	rec4 := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec4, req4)

	if rec4.Code != http.StatusAccepted {
		t.Fatalf("expected 202 Accepted for valid transcribe job, got %d: %s", rec4.Code, rec4.Body.String())
	}

	var acceptRes map[string]any
	if err := json.Unmarshal(rec4.Body.Bytes(), &acceptRes); err != nil {
		t.Fatalf("failed decoding accept JSON: %v", err)
	}
	if acceptRes["status"] != "ACCEPTED" {
		t.Fatalf("expected status ACCEPTED, got %v", acceptRes["status"])
	}
}

func TestServerCancel(t *testing.T) {
	cfg := &config.Config{
		Port: 8080,
	}
	queue := jobqueue.NewJobQueue(2)
	srv := NewServer(cfg, queue)

	// Cancel non-existent job -> 404
	cancelBody := bytes.NewBufferString(`{"videoId": "non-existent"}`)
	req := httptest.NewRequest(http.MethodPost, "/cancel", cancelBody)
	rec := httptest.NewRecorder()
	srv.httpSrv.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 Not Found for non-existent job cancel, got %d", rec.Code)
	}
}

