package metrics

import (
	"context"
	"sync"
	"time"

	"github.com/naveen/gometer/pkg/config"
)

// LiveCallback is called on each metric received (used by CLI progress bar or VS Code webview)
type LiveCallback func(m RequestMetric)

// Collector reads from a channel of metrics in background
type Collector struct {
	plan         *config.TestPlan
	metricChan   <-chan RequestMetric
	aggregator   *Aggregator
	liveCallback LiveCallback
	wg           sync.WaitGroup
	mu           sync.RWMutex
	done         bool
}

// NewCollector constructs a metrics collector
func NewCollector(plan *config.TestPlan, metricChan <-chan RequestMetric, cb LiveCallback) *Collector {
	return &Collector{
		plan:         plan,
		metricChan:   metricChan,
		aggregator:   NewAggregator(),
		liveCallback: cb,
	}
}

// Start spawns the reader goroutine
func (c *Collector) Start(ctx context.Context) {
	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		for {
			select {
			case <-ctx.Done():
				// Drain remaining metrics
				for m := range c.metricChan {
					c.aggregator.Record(m)
					if c.liveCallback != nil {
						c.liveCallback(m)
					}
				}
				return
			case m, ok := <-c.metricChan:
				if !ok {
					return
				}
				c.aggregator.Record(m)
				if c.liveCallback != nil {
					c.liveCallback(m)
				}
			}
		}
	}()
}

// Finalize waits for the channel to close and outputs the final Report
func (c *Collector) Finalize() *Report {
	c.wg.Wait()
	return c.aggregator.GenerateReport(c.plan, time.Now())
}

