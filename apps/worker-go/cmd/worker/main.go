package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"videohost-worker-go/internal/config"
	"videohost-worker-go/internal/jobqueue"
	"videohost-worker-go/internal/server"
	"videohost-worker-go/internal/transcoder"
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

	<-stopChan
	fmt.Println("\n[Worker Service] Received SIGTERM — shutting down gracefully...")

	// 1. Stop HTTP server from accepting new requests
	srvCtx, srvCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer srvCancel()
	if err := srv.Shutdown(srvCtx); err != nil {
		fmt.Printf("[Worker Service] Server shutdown error: %v\n", err)
	} else {
		fmt.Println("[Worker Service] HTTP server closed")
	}

	// 2. Discard pending queued jobs and dispatch CANCELLED webhooks
	queueCtx, queueCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer queueCancel()
	queue.Shutdown(queueCtx)

	// 3. Abort all active transcodes, delete partially uploaded S3 files, and dispatch CANCELLED webhooks
	transcoder.CancelAllActiveJobs(8 * time.Second)

	fmt.Println("[Worker Service] Shutdown cleanup complete")
}
