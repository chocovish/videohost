package jobqueue

import (
	"sync"
	"testing"
	"time"
)

func TestJobQueueConcurrency(t *testing.T) {
	q := NewJobQueue(2)

	var mu sync.Mutex
	running := 0
	maxObserved := 0

	runFn := func() error {
		mu.Lock()
		running++
		if running > maxObserved {
			maxObserved = running
		}
		mu.Unlock()

		time.Sleep(50 * time.Millisecond)

		mu.Lock()
		running--
		mu.Unlock()
		return nil
	}

	d1 := q.EnqueueJob("v1", "org1", "", runFn)
	d2 := q.EnqueueJob("v2", "org1", "", runFn)
	d3 := q.EnqueueJob("v3", "org1", "", runFn)

	<-d1
	<-d2
	<-d3

	if maxObserved > 2 {
		t.Fatalf("expected max observed concurrency <= 2, got %d", maxObserved)
	}

	stats := q.GetQueueStats()
	if stats.Active != 0 || stats.Queued != 0 {
		t.Fatalf("expected queue empty, got active: %d, queued: %d", stats.Active, stats.Queued)
	}
}

func TestCancelQueuedJob(t *testing.T) {
	q := NewJobQueue(1)

	started := make(chan struct{})
	blocker := make(chan struct{})

	_ = q.EnqueueJob("v1", "org1", "", func() error {
		close(started)
		<-blocker
		return nil
	})

	<-started

	_ = q.EnqueueJob("v2", "org1", "", func() error {
		return nil
	})

	if !q.IsJobQueuedOrActive("v2") {
		t.Fatalf("v2 should be queued")
	}

	removed := q.CancelQueuedJob("v2")
	if !removed {
		t.Fatalf("expected v2 to be removed from queue")
	}

	if q.IsJobQueuedOrActive("v2") {
		t.Fatalf("v2 should no longer be queued")
	}

	close(blocker)
}

