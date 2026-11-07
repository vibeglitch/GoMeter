package runner

import (
	"context"
	"time"
)

// Scheduler coordinates the staggered spin-up of virtual users
type Scheduler struct {
	virtualUsers int
	rampUp       time.Duration
}

// NewScheduler creates a scheduler for a scenario
func NewScheduler(virtualUsers int, rampUp time.Duration) *Scheduler {
	return &Scheduler{
		virtualUsers: virtualUsers,
		rampUp:       rampUp,
	}
}

// Interval returns the delay between starting each virtual user
func (s *Scheduler) Interval() time.Duration {
	if s.virtualUsers <= 1 || s.rampUp <= 0 {
		return 0
	}
	return s.rampUp / time.Duration(s.virtualUsers)
}

// WaitInterval pauses between spawning virtual users during ramp-up
func (s *Scheduler) WaitInterval(ctx context.Context, index int) bool {
	if index == 0 || s.rampUp <= 0 {
		return true
	}
	interval := s.Interval()
	select {
	case <-ctx.Done():
		return false
	case <-time.After(interval):
		return true
	}
}

