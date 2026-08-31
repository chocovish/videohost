package jobqueue

import (
	"context"
	"fmt"
	"sync"

	"videohost-worker-go/internal/progress"
)

type JobRunner func() error

type QueueEntry struct {
	VideoId     string
	OrgId       string
	CallbackUrl string
	Run         JobRunner
	Done        chan error
}

type QueueStats struct {
	Active        int `json:"active"`
	Queued        int `json:"queued"`
	MaxConcurrent int `json:"maxConcurrent"`
}

type JobQueue struct {
	maxConcurrent  int
	active         int
	pending        []*QueueEntry
	activeVideoIds map[string]bool
	mu             sync.Mutex
}

func NewJobQueue(maxConcurrent int) *JobQueue {
	if maxConcurrent <= 0 {
		maxConcurrent = 2
	}
	return &JobQueue{
		maxConcurrent:  maxConcurrent,
		active:         0,
		pending:        make([]*QueueEntry, 0),
		activeVideoIds: make(map[string]bool),
	}
}

func (q *JobQueue) SetMaxConcurrent(max int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if max > 0 {
		q.maxConcurrent = max
		q.drain()
	}
}

func (q *JobQueue) IsJobQueuedOrActive(videoId string) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	if q.activeVideoIds[videoId] {
		return true
	}
	for _, e := range q.pending {
		if e.VideoId == videoId {
			return true
		}
	}
	return false
}

// CancelQueuedJob removes a job from pending queue before it starts running.
// Returns true if removed, false if not queued (either active or not found).
func (q *JobQueue) CancelQueuedJob(videoId string) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	for i, e := range q.pending {
		if e.VideoId == videoId {
			q.pending = append(q.pending[:i], q.pending[i+1:]...)
			fmt.Printf("[Job Queue] Cancelled queued video %s (%d remaining)\n", videoId, len(q.pending))
			// Settle the waiting channel with nil
			close(e.Done)
			return true
		}
	}
	return false
}

func (q *JobQueue) GetQueueStats() QueueStats {
	q.mu.Lock()
	defer q.mu.Unlock()

	return QueueStats{
		Active:        q.active,
		Queued:        len(q.pending),
		MaxConcurrent: q.maxConcurrent,
	}
}

// Shutdown clears pending queue on SIGTERM, dispatches CANCELLED webhooks, and prevents new jobs from starting.
func (q *JobQueue) Shutdown(ctx context.Context) {
	q.mu.Lock()
	pendingList := q.pending
	q.pending = make([]*QueueEntry, 0)
	q.mu.Unlock()

	if len(pendingList) > 0 {
		fmt.Printf("[Job Queue] SIGTERM shutdown: discarding %d pending job(s)\n", len(pendingList))
		for _, e := range pendingList {
			if e.CallbackUrl != "" {
				reporter := progress.NewProgressReporter(e.VideoId, e.OrgId, e.CallbackUrl)
				cancelledPayload := map[string]any{
					"videoId":        e.VideoId,
					"organizationId": e.OrgId,
					"status":         "CANCELLED",
					"progress":       0,
					"error":          "Transcoding cancelled (worker shutdown before processing started)",
				}
				_ = reporter.Report(ctx, 0, "CANCELLED", true, cancelledPayload)
			}
			close(e.Done)
		}
	}
}

// EnqueueJob queues a video transcoding job. Returns a channel that closes with any error when the job finishes.
func (q *JobQueue) EnqueueJob(videoId, orgId, callbackUrl string, run JobRunner) <-chan error {
	q.mu.Lock()
	done := make(chan error, 1)
	entry := &QueueEntry{
		VideoId:     videoId,
		OrgId:       orgId,
		CallbackUrl: callbackUrl,
		Run:         run,
		Done:        done,
	}

	stats := QueueStats{
		Active:        q.active,
		Queued:        len(q.pending),
		MaxConcurrent: q.maxConcurrent,
	}
	fmt.Printf("[Job Queue] Queued video %s (position %d, %d/%d active)\n", videoId, stats.Queued+1, stats.Active, stats.MaxConcurrent)

	q.pending = append(q.pending, entry)
	q.drain()
	q.mu.Unlock()

	return done
}

func (q *JobQueue) drain() {
	for q.active < q.maxConcurrent && len(q.pending) > 0 {
		entry := q.pending[0]
		q.pending = q.pending[1:]
		q.active++
		q.activeVideoIds[entry.VideoId] = true

		fmt.Printf("[Job Queue] Starting video %s (%d/%d active, %d queued)\n", entry.VideoId, q.active, q.maxConcurrent, len(q.pending))

		go func(e *QueueEntry) {
			var runErr error
			defer func() {
				q.mu.Lock()
				q.active--
				delete(q.activeVideoIds, e.VideoId)
				fmt.Printf("[Job Queue] Finished video %s (%d/%d active, %d queued)\n", e.VideoId, q.active, q.maxConcurrent, len(q.pending))
				q.drain()
				q.mu.Unlock()

				if runErr != nil {
					e.Done <- runErr
				}
				close(e.Done)
			}()

			runErr = e.Run()
		}(entry)
	}
}

