package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"videohost-worker-go/internal/config"
	"videohost-worker-go/internal/jobqueue"
	"videohost-worker-go/internal/transcoder"
	"videohost-worker-go/internal/urlutils"
)

type Server struct {
	cfg   *config.Config
	queue *jobqueue.JobQueue
	httpSrv *http.Server
}

func NewServer(cfg *config.Config, queue *jobqueue.JobQueue) *Server {
	s := &Server{
		cfg:   cfg,
		queue: queue,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", s.handleRoot)

	s.httpSrv = &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
	}

	return s
}

func (s *Server) Start() error {
	fmt.Printf("[Worker Service] Container HTTP Server listening on port %d\n", s.cfg.Port)
	return s.httpSrv.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpSrv.Shutdown(ctx)
}

func (s *Server) sendJSONResponse(w http.ResponseWriter, statusCode int, data any) {
	converted := urlutils.TransformJSONDockerHostToLocalhost(data)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(converted)
}

func (s *Server) checkAuth(r *http.Request) bool {
	if s.cfg.WorkerSecretToken == "" {
		return true
	}

	authHeader := r.Header.Get("Authorization")
	secretHeader := r.Header.Get("x-worker-secret")

	var token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	} else if secretHeader != "" {
		token = secretHeader
	}

	return token == s.cfg.WorkerSecretToken
}

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	urlPath := r.URL.Path
	method := r.Method

	// GET /health or GET /
	if method == http.MethodGet && (urlPath == "/health" || urlPath == "/") {
		s.sendJSONResponse(w, http.StatusOK, map[string]any{
			"status":    "ok",
			"service":   "videohost-transcoder",
			"queue":     s.queue.GetQueueStats(),
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		})
		return
	}

	// GET /stats
	if method == http.MethodGet && urlPath == "/stats" {
		s.sendJSONResponse(w, http.StatusOK, map[string]any{
			"queue": s.queue.GetQueueStats(),
		})
		return
	}

	// POST /transcode, /api/transcode, /process
	if method == http.MethodPost && (urlPath == "/transcode" || urlPath == "/api/transcode" || urlPath == "/process") {
		if !s.checkAuth(r) {
			fmt.Printf("[Worker HTTP] Unauthorized trigger attempt from %s\n", r.RemoteAddr)
			s.sendJSONResponse(w, http.StatusUnauthorized, map[string]any{
				"error": "Unauthorized: invalid worker secret token",
			})
			return
		}

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			s.sendJSONResponse(w, http.StatusBadRequest, map[string]any{
				"error": "Invalid JSON payload",
			})
			return
		}

		var payload transcoder.TranscodeJobPayload
		if err := json.Unmarshal(bodyBytes, &payload); err != nil {
			s.sendJSONResponse(w, http.StatusBadRequest, map[string]any{
				"error": "Invalid JSON payload",
			})
			return
		}

		// Apply localhost to host.docker.internal conversion on payload when running in Docker
		if payload.CallbackUrl != "" {
			payload.CallbackUrl = urlutils.UseDockerHostForLocalhost(payload.CallbackUrl)
		}
		if payload.S3 != nil && payload.S3.Endpoint != "" {
			payload.S3.Endpoint = urlutils.UseDockerHostForLocalhost(payload.S3.Endpoint)
		}

		videoId := payload.VideoId
		if videoId == "" {
			s.sendJSONResponse(w, http.StatusBadRequest, map[string]any{
				"error": "videoId is required",
			})
			return
		}

		fmt.Printf("[Worker HTTP] Received transcode request for videoId: %s\n", videoId)

		if s.queue.IsJobQueuedOrActive(videoId) {
			s.sendJSONResponse(w, http.StatusAccepted, map[string]any{
				"status":  "ALREADY_QUEUED",
				"message": "Transcode job for this video is already queued or in progress",
				"videoId": videoId,
				"queue":   s.queue.GetQueueStats(),
			})
			return
		}

		s.sendJSONResponse(w, http.StatusAccepted, map[string]any{
			"status":  "ACCEPTED",
			"message": "Transcoding job queued",
			"videoId": videoId,
			"queue":   s.queue.GetQueueStats(),
		})

		// Asynchronously process job through bounded queue
		s.queue.EnqueueJob(videoId, payload.OrganizationId, payload.CallbackUrl, func() error {
			_, err := transcoder.ProcessVideoJob(context.Background(), payload)
			if err != nil {
				fmt.Printf("[Worker HTTP] Async error processing videoId %s: %v\n", videoId, err)
				return err
			}
			fmt.Printf("[Worker HTTP] Container finished job for videoId: %s\n", videoId)
			return nil
		})
		return
	}

	// POST /cancel or /api/cancel
	if method == http.MethodPost && (urlPath == "/cancel" || urlPath == "/api/cancel") {
		if !s.checkAuth(r) {
			fmt.Printf("[Worker HTTP] Unauthorized cancel attempt from %s\n", r.RemoteAddr)
			s.sendJSONResponse(w, http.StatusUnauthorized, map[string]any{
				"error": "Unauthorized: invalid worker secret token",
			})
			return
		}

		var payload struct {
			VideoId string `json:"videoId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.VideoId == "" {
			s.sendJSONResponse(w, http.StatusBadRequest, map[string]any{
				"error": "videoId is required",
			})
			return
		}

		videoId := payload.VideoId
		removedFromQueue := s.queue.CancelQueuedJob(videoId)
		abortedActive := transcoder.CancelActiveTranscode(videoId)

		fmt.Printf("[Worker HTTP] Cancel for videoId %s: queued=%v, active=%v\n", videoId, removedFromQueue, abortedActive)

		if !removedFromQueue && !abortedActive && !s.queue.IsJobQueuedOrActive(videoId) {
			s.sendJSONResponse(w, http.StatusNotFound, map[string]any{
				"status":  "NOT_FOUND",
				"message": "No queued or active transcode job found for this video",
				"videoId": videoId,
				"queue":   s.queue.GetQueueStats(),
			})
			return
		}

		msg := "Job removed from queue"
		if !removedFromQueue && abortedActive {
			msg = "Active transcode aborted"
		}

		s.sendJSONResponse(w, http.StatusOK, map[string]any{
			"status":           "CANCELLED",
			"message":          msg,
			"videoId":          videoId,
			"removedFromQueue": removedFromQueue,
			"abortedActive":    abortedActive,
			"queue":            s.queue.GetQueueStats(),
		})
		return
	}

	// 404 for unknown endpoints
	s.sendJSONResponse(w, http.StatusNotFound, map[string]any{
		"error": "Not Found",
	})
}

