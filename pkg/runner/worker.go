package runner

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/naveen/gometer/pkg/assertion"
	"github.com/naveen/gometer/pkg/config"
	gmHttp "github.com/naveen/gometer/pkg/http"
	"github.com/naveen/gometer/pkg/metrics"
	"github.com/naveen/gometer/pkg/parameterizer"
)

// Worker represents a single virtual user (VU)
type Worker struct {
	userID     int
	plan       *config.TestPlan
	scenario   config.Scenario
	client     *http.Client
	builder    *gmHttp.RequestBuilder
	evaluator  *assertion.Evaluator
	store      *parameterizer.Store
	csvMgr     *parameterizer.CSVManager
	metricChan chan<- metrics.RequestMetric
}

// NewWorker constructs a worker goroutine
func NewWorker(
	userID int,
	plan *config.TestPlan,
	scenario config.Scenario,
	client *http.Client,
	csvMgr *parameterizer.CSVManager,
	metricChan chan<- metrics.RequestMetric,
) *Worker {
	// Initialize store with plan inline variables
	initialVars := make(map[string]string)
	for k, v := range plan.Variables.Inline {
		initialVars[k] = v
	}

	store := parameterizer.NewStore(initialVars)
	if csvMgr != nil {
		csvMgr.PopulateNextRow(store)
	}

	return &Worker{
		userID:     userID,
		plan:       plan,
		scenario:   scenario,
		client:     client,
		builder:    gmHttp.NewRequestBuilder(plan.BaseURL, plan.Defaults),
		evaluator:  assertion.NewEvaluator(),
		store:      store,
		csvMgr:     csvMgr,
		metricChan: metricChan,
	}
}

// Run executes the worker lifecycle until context cancellation or iteration count
func (w *Worker) Run(ctx context.Context) {
	iteration := 0

	for {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Execute one full scenario iteration (all requests in sequence)
		for _, reqDef := range w.scenario.Requests {
			// Check if context expired before next request
			select {
			case <-ctx.Done():
				return
			default:
			}

			w.executeRequest(ctx, reqDef)

			// Think time between requests
			if w.scenario.ThinkTime > 0 {
				select {
				case <-ctx.Done():
					return
				case <-time.After(w.scenario.ThinkTime):
				}
			}
		}

		iteration++
		if w.scenario.Iterations > 0 && iteration >= w.scenario.Iterations {
			return
		}

		// Refresh CSV row for next iteration if CSV data is active
		if w.csvMgr != nil {
			w.csvMgr.PopulateNextRow(w.store)
		}
	}
}

func (w *Worker) executeRequest(ctx context.Context, reqDef config.Request) {
	httpReq, reqBodyBytes, err := w.builder.Build(ctx, reqDef, w.store)

	metric := metrics.RequestMetric{
		ScenarioName: w.scenario.Name,
		RequestName:  reqDef.Name,
		Method:       reqDef.Method,
		URL:          reqDef.Path,
		Timestamp:    time.Now(),
		UserID:       w.userID,
		BytesOut:     int64(len(reqBodyBytes)),
	}

	if err != nil {
		metric.Error = err.Error()
		metric.Passed = false
		w.metricChan <- metric
		return
	}

	if httpReq != nil && httpReq.URL != nil {
		metric.URL = httpReq.URL.String()
		reqHeaders := make(map[string]string)
		for k, v := range httpReq.Header {
			if len(v) > 0 {
				reqHeaders[k] = v[0]
			}
		}
		metric.RequestHeaders = reqHeaders
	}
	if len(reqBodyBytes) > 0 {
		if len(reqBodyBytes) > 10240 {
			metric.RequestBody = string(reqBodyBytes[:10240]) + "... (truncated)"
		} else {
			metric.RequestBody = string(reqBodyBytes)
		}
	}

	start := time.Now()
	resp, reqErr := w.client.Do(httpReq)
	elapsed := time.Since(start)
	metric.Latency = elapsed

	if reqErr != nil {
		if ctx.Err() != nil {
			// Context expired or cancelled; skip recording interrupted in-flight request
			return
		}
		metric.Error = reqErr.Error()
		metric.Passed = false
		w.metricChan <- metric
		return
	}
	defer resp.Body.Close()

	respHeaders := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			respHeaders[k] = v[0]
		}
	}
	metric.ResponseHeaders = respHeaders

	respBody, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		metric.Error = readErr.Error()
	}

	metric.StatusCode = resp.StatusCode
	metric.BytesIn = int64(len(respBody))
	if len(respBody) > 10240 {
		metric.ResponseBody = string(respBody[:10240]) + "... (truncated)"
	} else {
		metric.ResponseBody = string(respBody)
	}

	// Evaluate assertions
	results, passed := w.evaluator.EvaluateAll(reqDef.Assertions, resp, respBody, elapsed, w.store)
	metric.Passed = passed

	var assertionMsgs []string
	for _, res := range results {
		status := "PASS"
		if !res.Passed {
			status = "FAIL"
		}
		msg := fmt.Sprintf("[%s] %s: expected %s, got %s", status, res.Type, res.Expected, res.Actual)
		if res.Error != "" {
			msg += fmt.Sprintf(" (%s)", res.Error)
		}
		assertionMsgs = append(assertionMsgs, msg)
	}
	metric.Assertions = assertionMsgs

	// Extract variables for subsequent requests
	w.evaluator.ExtractAll(reqDef.Extract, resp, respBody, w.store)

	w.metricChan <- metric
}
