package runner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/naveen/gometer/pkg/config"
	gmHttp "github.com/naveen/gometer/pkg/http"
	"github.com/naveen/gometer/pkg/metrics"
	"github.com/naveen/gometer/pkg/parameterizer"
)

// Runner manages the complete test plan execution
type Runner struct {
	plan         *config.TestPlan
	collector    *metrics.Collector
	metricChan   chan metrics.RequestMetric
	clientPool   *gmHttp.ClientPool
	csvMgr       *parameterizer.CSVManager
	liveCallback metrics.LiveCallback
}

// NewRunner creates a new test runner
func NewRunner(plan *config.TestPlan, cb metrics.LiveCallback) (*Runner, error) {
	// Initialize CSV data sources if defined
	csvMgr, err := parameterizer.NewCSVManager(plan.Variables.CSV)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize CSV data: %w", err)
	}

	metricChan := make(chan metrics.RequestMetric, 50000)
	collector := metrics.NewCollector(plan, metricChan, cb)

	timeout := plan.Defaults.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	return &Runner{
		plan:         plan,
		collector:    collector,
		metricChan:   metricChan,
		clientPool:   gmHttp.NewClientPool(timeout),
		csvMgr:       csvMgr,
		liveCallback: cb,
	}, nil
}

// Run executes all scenarios in the test plan concurrently
func (r *Runner) Run(ctx context.Context) (*metrics.Report, error) {
	// Start collector
	r.collector.Start(ctx)

	var wg sync.WaitGroup

	for _, sc := range r.plan.Scenarios {
		wg.Add(1)
		go func(scenario config.Scenario) {
			defer wg.Done()
			r.runScenario(ctx, scenario)
		}(sc)
	}

	// Wait for all scenarios to finish
	wg.Wait()

	// Close metrics channel to signal collector EOF
	close(r.metricChan)

	// Collect final report
	report := r.collector.Finalize()
	return report, nil
}

func (r *Runner) runScenario(parentCtx context.Context, sc config.Scenario) {
	ctx := parentCtx
	var cancel context.CancelFunc
	if sc.Duration > 0 {
		ctx, cancel = context.WithTimeout(parentCtx, sc.Duration)
		defer cancel()
	}

	scheduler := NewScheduler(sc.VirtualUsers, sc.RampUp)
	var workerWg sync.WaitGroup

	for i := 0; i < sc.VirtualUsers; i++ {
		// Wait ramp-up interval
		if !scheduler.WaitInterval(ctx, i) {
			break
		}

		workerWg.Add(1)
		go func(userID int) {
			defer workerWg.Done()
			worker := NewWorker(
				userID,
				r.plan,
				sc,
				r.clientPool.Client(),
				r.csvMgr,
				r.metricChan,
			)
			worker.Run(ctx)
		}(i)
	}

	workerWg.Wait()
}
