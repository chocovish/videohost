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

