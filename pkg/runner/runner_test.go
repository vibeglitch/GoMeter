package runner

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/naveen/gometer/pkg/config"
)

func TestRunner_EndToEnd(t *testing.T) {
	// Create mock HTTP server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/ping":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"pong"}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer mockServer.Close()

	plan := &config.TestPlan{
		Name:    "Mock Test",
		BaseURL: mockServer.URL,
		Scenarios: []config.Scenario{
			{
				Name:         "Quick Smoke",
				VirtualUsers: 3,
				Duration:     500 * time.Millisecond,
				Requests: []config.Request{
					{
						Name:   "Ping API",
						Method: "GET",
						Path:   "/api/ping",
						Assertions: []config.Assertion{
							{Type: "status", Expected: "200"},
							{Type: "body_json", Path: "$.status", Expected: "pong"},
							{Type: "latency", Expected: "<500ms"},
						},
					},
				},
				Thresholds: []config.Threshold{
					{Metric: "p95_latency", Operator: "<", Value: 500, Unit: "ms"},
					{Metric: "error_rate", Operator: "<", Value: 1.0, Unit: "%"},
				},
			},
		},
	}

	r, err := NewRunner(plan, nil)
	if err != nil {
		t.Fatalf("NewRunner failed: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	report, err := r.Run(ctx)
	if err != nil {
		t.Fatalf("Run failed: %v", err)
	}

	if report.TotalReqs == 0 {
		t.Fatal("expected >0 total requests, got 0")
	}

	if report.FailedReqs > 0 {
		t.Fatalf("expected 0 failed requests, got %d", report.FailedReqs)
	}

	if !report.Passed {
		t.Fatal("expected test plan to pass, got failed")
	}
}

