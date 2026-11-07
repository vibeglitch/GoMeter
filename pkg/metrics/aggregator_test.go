package metrics

import (
	"testing"
	"time"

	"github.com/naveen/gometer/pkg/config"
)

func TestAggregator_RecordAndSample(t *testing.T) {
	agg := NewAggregator()

	plan := &config.TestPlan{
		Name:    "Sample Test",
		BaseURL: "http://example.com",
		Scenarios: []config.Scenario{
			{
				Name:         "Scenario 1",
				VirtualUsers: 1,
				Duration:     time.Second,
				Requests: []config.Request{
					{Name: "Req 1", Method: "GET", Path: "/api/test"},
				},
				Thresholds: []config.Threshold{
					{Metric: "p95_latency", Operator: "<", Value: 500, Unit: "ms"},
				},
			},
		},
		Thresholds: []config.Threshold{
			{Metric: "error_rate", Operator: "<", Value: 10, Unit: "%"},
		},
	}

	metric := RequestMetric{
		ScenarioName: "Scenario 1",
		RequestName:  "Req 1",
		Method:       "GET",
		URL:          "http://example.com/api/test",
		StatusCode:   200,
		Latency:      15 * time.Millisecond,
		BytesIn:      1024,
		BytesOut:     256,
		Passed:       true,
		RequestHeaders: map[string]string{
			"Authorization": "Bearer token",
		},
		RequestBody: "{\"test\": true}",
		ResponseHeaders: map[string]string{
			"Content-Type": "application/json",
		},
		ResponseBody: "{\"status\": \"ok\"}",
		Assertions: []string{
			"[PASS] status: expected 200, got 200",
		},
		Timestamp: time.Now(),
	}

	agg.Record(metric)

	report := agg.GenerateReport(plan, time.Now())
	if report.TotalReqs != 1 {
		t.Fatalf("expected 1 total req, got %d", report.TotalReqs)
	}
	if report.SuccessReqs != 1 {
		t.Fatalf("expected 1 success req, got %d", report.SuccessReqs)
	}
	if len(report.Samples) != 1 {
		t.Fatalf("expected 1 sample, got %d", len(report.Samples))
	}

	sample := report.Samples[0]
	if sample.StatusCode != 200 {
		t.Errorf("expected sample status 200, got %d", sample.StatusCode)
	}
	if sample.RequestHeaders["Authorization"] != "Bearer token" {
		t.Errorf("expected sample request header Authorization, got %v", sample.RequestHeaders)
	}
	if sample.ResponseBody != "{\"status\": \"ok\"}" {
		t.Errorf("unexpected sample response body: %s", sample.ResponseBody)
	}
	if len(sample.Assertions) != 1 || sample.Assertions[0] != "[PASS] status: expected 200, got 200" {
		t.Errorf("unexpected sample assertions: %v", sample.Assertions)
	}

	// Verify plan and scenario thresholds
	if len(report.Thresholds) != 2 {
		t.Fatalf("expected 2 evaluated thresholds, got %d", len(report.Thresholds))
	}
	if !report.Passed {
		t.Errorf("expected report to pass all thresholds")
	}
}

