package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func getEnvString(val string) string {
	if val == "" {
		return ""
	}
	cleaned := strings.Trim(strings.TrimSpace(val), "\"'`\r\n")
	return cleaned
}

func getEnvInt(val string, fallback int) int {
	if val == "" {
		return fallback
	}
	cleaned := strings.Trim(strings.TrimSpace(val), "\"'`\r\n")
	parsed, err := strconv.Atoi(cleaned)
	if err != nil {
		return fallback
	}
	return parsed
}

func sendJsonResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	converted := UseLocalhostForDockerHost(data)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(converted)
}

func getRemoteIP(r *http.Request) string {
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func loadDotEnv() {
	// Try loading root .env if present
	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	rootEnvPath := filepath.Join(cwd, "..", "..", ".env")
	if data, err := os.ReadFile(rootEnvPath); err == nil {
		parseEnvLines(string(data))
	}
	localEnvPath := filepath.Join(cwd, ".env")
	if data, err := os.ReadFile(localEnvPath); err == nil {
		parseEnvLines(string(data))
	}
}

func parseEnvLines(content string) {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), "\"'`\r\n")
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

func main() {
	loadDotEnv()

	port := getEnvInt(os.Getenv("PORT"), 8080)
	workerSecretToken := getEnvString(os.Getenv("WORKER_SECRET_TOKEN"))

	mux := http.NewServeMux()

	// Handler logic
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		url := r.URL.Path
		method := r.Method

		// Health check endpoint
		if method == "GET" && (url == "/health" || url == "/") {
			sendJsonResponse(w, 200, map[string]interface{}{
				"status":    "ok",
				"service":   "videohost-transcoder",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			return
		}

		// Transcode trigger endpoint
		if method == "POST" && (url == "/transcode" || url == "/api/transcode" || url == "/process") {
			if workerSecretToken != "" {
				authHeader := r.Header.Get("Authorization")
				secretHeader := r.Header.Get("x-worker-secret")

				token := ""
				if strings.HasPrefix(authHeader, "Bearer ") {
					token = strings.TrimPrefix(authHeader, "Bearer ")
				} else if secretHeader != "" {
					token = secretHeader
				}

				if token != workerSecretToken {
					fmt.Printf("[Worker HTTP] Unauthorized trigger attempt from %s\n", getRemoteIP(r))
					sendJsonResponse(w, 401, map[string]interface{}{
						"error": "Unauthorized: invalid worker secret token",
					})
					return
				}
			}

			bodyBytes, err := io.ReadAll(r.Body)
			if err != nil {
				sendJsonResponse(w, 400, map[string]interface{}{"error": "Invalid body"})
				return
			}
			defer r.Body.Close()

			var rawPayload map[string]interface{}
			if err := json.Unmarshal(bodyBytes, &rawPayload); err != nil && len(bodyBytes) > 0 {
				sendJsonResponse(w, 400, map[string]interface{}{"error": "Invalid JSON payload"})
				return
			}
			if rawPayload == nil {
				rawPayload = make(map[string]interface{})
			}

			payload := UseDockerHostForLocalhost(rawPayload).(map[string]interface{})
			videoId, _ := payload["videoId"].(string)

			if videoId == "" {
				sendJsonResponse(w, 400, map[string]interface{}{"error": "videoId is required"})
				return
			}

			prettyPayload, _ := json.MarshalIndent(payload, "", "  ")
			fmt.Printf("[Worker HTTP] Received transcode request for videoId: %s:\n%s\n", videoId, string(prettyPayload))

			// Acknowledge request immediately
			sendJsonResponse(w, 202, map[string]interface{}{
				"status":  "ACCEPTED",
				"message": "Transcoding job started in container",
				"videoId": videoId,
			})

			// Process video job asynchronously in goroutine
			go func() {
				defer func() {
					if r := recover(); r != nil {
						fmt.Printf("[Worker HTTP] Panic recovered during transcode for videoId %s: %v\n", videoId, r)
					}
				}()

				_, err := ProcessVideoJob(payload)
				if err != nil {
					fmt.Printf("[Worker HTTP] Async error processing videoId %s: %v\n", videoId, err)
				} else {
					fmt.Printf("[Worker HTTP] Container finished job for videoId: %s\n", videoId)
				}
			}()
			return
		}

		// 404 for unknown endpoints
		sendJsonResponse(w, 404, map[string]interface{}{"error": "Not Found"})
	})

	mux.Handle("/", handler)

	// Optional Redis worker log notice
	redisHost := getEnvString(os.Getenv("REDIS_HOST"))
	redisDisabled := os.Getenv("DISABLE_REDIS") == "true" || os.Getenv("DISABLE_REDIS") == "\"true\""

	if redisHost != "" && !redisDisabled {
		redisPort := getEnvInt(os.Getenv("REDIS_PORT"), 6379)
		fmt.Printf("[Worker Service] Starting optional BullMQ worker connecting to Redis at %s:%d\n", redisHost, redisPort)
	}

	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("[Worker Service] Container HTTP Server listening on port %d\n", port)

	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		fmt.Printf("[Worker Service] Server error: %v\n", err)
	}
}
