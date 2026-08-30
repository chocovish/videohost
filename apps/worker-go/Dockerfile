# Multi-stage Docker build for Go Worker
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build statically linked binary
COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o worker-go ./cmd/worker

# Lightweight Alpine runtime stage with FFmpeg and system certs
FROM alpine:latest AS runner

RUN apk add --no-cache \
    ffmpeg \
    ca-certificates \
    openssl

WORKDIR /app

ENV PORT=8080
ENV IS_DOCKER=true

COPY --from=builder /app/worker-go /app/worker-go

EXPOSE 8080

CMD ["/app/worker-go"]
