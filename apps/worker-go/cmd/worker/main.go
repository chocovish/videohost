package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"go.codycody31.dev/gobullmq"

	"videohost-worker-go/internal/config"
	"videohost-worker-go/internal/jobqueue"
	"videohost-worker-go/internal/server"
	"videohost-worker-go/internal/transcoder"
	"videohost-worker-go/internal/urlutils"
)

func main() {
	cfg := config.LoadConfig()
	fmt.Printf("[Worker Service] Initializing stateless video worker with max concurrent jobs: %d, port: %d\n", cfg.MaxConcurrentJobs, cfg.Port)

	queue := jobqueue.NewJobQueue(cfg.MaxConcurrentJobs)
	srv := server.NewServer(cfg, queue)

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := srv.Start(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("[Worker Service] Server error: %v\n", err)
			os.Exit(1)
		}
	}()

	var bullWorker *gobullmq.Worker[transcoder.TranscodeJobPayload, map[string]any]
	var redisClient *redis.Client
	var workerCtx context.Context
	var workerCancel context.CancelFunc

	if cfg.RedisConnectionURL != "" {
		fmt.Println("[Worker Service] REDIS_URL is set. Initializing gobullmq worker...")
		opts, err := redis.ParseURL(cfg.RedisConnectionURL)
		if err != nil {
			fmt.Printf("[Worker BullMQ] Failed to parse REDIS_URL: %v\n", err)
		} else {
			redisClient = redis.NewClient(opts)
			pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
			if err := redisClient.Ping(pingCtx).Err(); err != nil {
				fmt.Printf("[Worker BullMQ] Warning: Redis ping failed on startup: %v\n", err)
			} else {
				fmt.Println("[Worker BullMQ] Connected to Redis successfully")
			}
			pingCancel()

			processor := func(ctx context.Context, job *gobullmq.Job[transcoder.TranscodeJobPayload]) (map[string]any, error) {
				payload := job.Data()
				if payload.CallbackUrl != "" {
					payload.CallbackUrl = urlutils.UseDockerHostForLocalhost(payload.CallbackUrl)
				}
				if payload.S3 != nil && payload.S3.Endpoint != "" {
					payload.S3.Endpoint = urlutils.UseDockerHostForLocalhost(payload.S3.Endpoint)
				}

				fmt.Printf("[Worker BullMQ] Received transcode job %s for videoId: %s\n", job.ID(), payload.VideoId)
				res, err := transcoder.ProcessVideoJob(ctx, payload)
				if err != nil {
					fmt.Printf("[Worker BullMQ] Job %s (videoId: %s) failed: %v\n", job.ID(), payload.VideoId, err)
					return nil, err
				}
				fmt.Printf("[Worker BullMQ] Job %s (videoId: %s) completed successfully\n", job.ID(), payload.VideoId)
				return res, nil
			}

			w, err := gobullmq.NewWorker[transcoder.TranscodeJobPayload, map[string]any](
				"video-transcode",
				redisClient,
				processor,
				&gobullmq.WorkerOptions{
					Concurrency: cfg.MaxConcurrentJobs,
					Prefix:      "bull",
				},
			)
			if err != nil {
				fmt.Printf("[Worker BullMQ] Failed to create gobullmq worker: %v\n", err)
			} else {
				bullWorker = w

				bullWorker.OnCompleted(func(job *gobullmq.Job[transcoder.TranscodeJobPayload], result map[string]any) {
					fmt.Printf("[Worker BullMQ] Event: Job %s completed\n", job.ID())
				})
				bullWorker.OnFailed(func(job *gobullmq.Job[transcoder.TranscodeJobPayload], err error) {
					fmt.Printf("[Worker BullMQ] Event: Job %s failed: %v\n", job.ID(), err)
				})
				bullWorker.OnError(func(err error) {
					fmt.Printf("[Worker BullMQ] Worker error: %v\n", err)
				})
				bullWorker.OnStalled(func(jobID string) {
					fmt.Printf("[Worker BullMQ] Job %s stalled\n", jobID)
				})

				workerCtx, workerCancel = context.WithCancel(context.Background())
				go func() {
					fmt.Printf("[Worker Service] gobullmq worker listening on queue \"video-transcode\" with concurrency %d\n", cfg.MaxConcurrentJobs)
					if err := bullWorker.Run(workerCtx); err != nil && !errors.Is(err, context.Canceled) {
						fmt.Printf("[Worker BullMQ] Worker loop error: %v\n", err)
					}
				}()
			}
		}
	} else {
		fmt.Println("[Worker Service] REDIS_URL not set — running in standalone HTTP mode")
	}

	<-stopChan
	fmt.Println("\n[Worker Service] Received SIGTERM — shutting down gracefully...")

	// 1. Stop gobullmq worker if running
	if workerCancel != nil {
		workerCancel()
	}
	if bullWorker != nil {
		fmt.Println("[Worker Service] Shutting down gobullmq worker...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = bullWorker.Shutdown(shutdownCtx)
		shutdownCancel()
		fmt.Println("[Worker Service] gobullmq worker closed")
	}
	if redisClient != nil {
		_ = redisClient.Close()
	}

	// 2. Stop HTTP server from accepting new requests
	srvCtx, srvCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer srvCancel()
	if err := srv.Shutdown(srvCtx); err != nil {
		fmt.Printf("[Worker Service] Server shutdown error: %v\n", err)
	} else {
		fmt.Println("[Worker Service] HTTP server closed")
	}

	// 3. Discard pending queued jobs and dispatch CANCELLED webhooks
	queueCtx, queueCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer queueCancel()
	queue.Shutdown(queueCtx)

	// 4. Abort all active transcodes, delete partially uploaded S3 files, and dispatch CANCELLED webhooks
	transcoder.CancelAllActiveJobs(8 * time.Second)

	fmt.Println("[Worker Service] Shutdown cleanup complete")
}
