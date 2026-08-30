# Video Transcoder Worker (Go Edition)

A high-performance, stateless transcoding and packaging worker service written in Go.

## Features

- **Stateless HTTP API**: High-performance HTTP server matching `apps/worker` endpoints (`/health`, `/stats`, `/transcode`, `/cancel`).
- **Payload-Driven Architecture**: Fully independent of job environment variables; all storage credentials, buckets, and endpoints are supplied per request.
- **Aspect Ratio Preservation**: Automatic Display Aspect Ratio (DAR) calculation and exact even-rounding scaling ladder.
- **Adaptive Ladder (No Upscaling)**: Never upscales beyond the source resolution; automatically injects native resolution rungs when significant gap exists.
- **Single-Pass Multi-Representation DASH + HLS**: Encodes all renditions concurrently into an MPEG-DASH and HLS single manifest structure using FFmpeg.
- **WebP Thumbnails**: Fast extraction and quality compression to WebP.
- **Direct S3 / R2 Multipart Uploads**: Uploads original source, DASH files, and thumbnails directly to Cloudflare R2 / AWS S3 / MinIO.
- **Thread-safe Bounded Job Queue**: Limits active transcode jobs with concurrency controls (`WORKER_MAX_CONCURRENT_JOBS`).
- **Live Cancellation**: Aborts queued jobs or kills active FFmpeg processes immediately upon request (`POST /cancel`).
- **Docker Network Translation**: Converts `localhost` and `host.docker.internal` seamlessly when operating inside Docker containers.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | Worker HTTP server listening port | `8080` |
| `WORKER_SECRET_TOKEN` | Optional auth token required for `/transcode` and `/cancel` | `""` |
| `WORKER_MAX_CONCURRENT_JOBS` | Maximum number of active transcoding jobs at once | `2` |

## Running Locally

```bash
# Run tests
go test -v ./...

# Run locally
go run ./cmd/worker

# Build binary
go build -o worker ./cmd/worker
```

## Running with Docker (Alpine)

```bash
# Build Docker image from repository root
docker build -t videohost-worker-go -f Dockerfile.worker-go .

# Run container
docker run -p 8080:8080 videohost-worker-go
```
