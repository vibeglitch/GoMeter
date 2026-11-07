package metrics

import (
	"time"
)

// RequestMetric captures a single request's execution telemetry
type RequestMetric struct {
	ScenarioName    string            `json:"scenario_name"`
	RequestName     string            `json:"request_name"`
	Method          string            `json:"method"`
	URL             string            `json:"url"`
	StatusCode      int               `json:"status_code"`
	Latency         time.Duration     `json:"latency"`
	BytesIn         int64             `json:"bytes_in"`
	BytesOut        int64             `json:"bytes_out"`
	Error           string            `json:"error,omitempty"`
	Timestamp       time.Time         `json:"timestamp"`
	UserID          int               `json:"user_id"`
	Passed          bool              `json:"passed"`
	RequestHeaders  map[string]string `json:"request_headers,omitempty"`
	RequestBody     string            `json:"request_body,omitempty"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody    string            `json:"response_body,omitempty"`
	Assertions      []string          `json:"assertions,omitempty"`
}

// RequestSample captures detailed request/response payload for UX inspection
type RequestSample struct {
	Timestamp       time.Time         `json:"timestamp"`
	ScenarioName    string            `json:"scenario_name"`
	RequestName     string            `json:"request_name"`
	Method          string            `json:"method"`
	URL             string            `json:"url"`
	StatusCode      int               `json:"status_code"`
	Latency         time.Duration     `json:"latency"`
	RequestHeaders  map[string]string `json:"request_headers,omitempty"`
	RequestBody     string            `json:"request_body,omitempty"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody    string            `json:"response_body,omitempty"`
	Error           string            `json:"error,omitempty"`
	Passed          bool              `json:"passed"`
	Assertions      []string          `json:"assertions,omitempty"`
}

// LiveMetric emitted to streaming listeners (e.g., VS Code extension webview)
type LiveMetric struct {
	Type            string            `json:"type"` // "metric", "status", "complete"
	Timestamp       time.Time         `json:"timestamp"`
	ScenarioName    string            `json:"scenario_name"`
	RequestName     string            `json:"request_name"`
	Method          string            `json:"method,omitempty"`
	URL             string            `json:"url,omitempty"`
	LatencyMs       float64           `json:"latency_ms"`
	StatusCode      int               `json:"status_code"`
	Success         bool              `json:"success"`
	ActiveVUs       int               `json:"active_vus"`
	CumulativeRPS   float64           `json:"cumulative_rps"`
	RequestHeaders  map[string]string `json:"request_headers,omitempty"`
	RequestBody     string            `json:"request_body,omitempty"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody    string            `json:"response_body,omitempty"`
	Assertions      []string          `json:"assertions,omitempty"`
	Error           string            `json:"error,omitempty"`
}

// Report is the final aggregated test report
type Report struct {
	TestName    string            `json:"test_name"`
	Description string            `json:"description,omitempty"`
	StartTime   time.Time         `json:"start_time"`
	EndTime     time.Time         `json:"end_time"`
	Duration    time.Duration     `json:"duration"`
	TotalReqs   int64             `json:"total_requests"`
	SuccessReqs int64             `json:"success_requests"`
	FailedReqs  int64             `json:"failed_requests"`
	RPS         float64           `json:"requests_per_second"`
	ErrorRate   float64           `json:"error_rate_percent"`
	AvgLatency  time.Duration     `json:"avg_latency"`
	MinLatency  time.Duration     `json:"min_latency"`
	MaxLatency  time.Duration     `json:"max_latency"`
	P50Latency  time.Duration     `json:"p50_latency"`
	P90Latency  time.Duration     `json:"p90_latency"`
	P95Latency  time.Duration     `json:"p95_latency"`
	P99Latency  time.Duration     `json:"p99_latency"`
	TotalBytesIn int64            `json:"total_bytes_in"`
	TotalBytesOut int64           `json:"total_bytes_out"`
	Scenarios     []ScenarioReport  `json:"scenarios"`
	Thresholds    []ThresholdResult `json:"thresholds"`
	Passed        bool              `json:"passed"`
	Samples       []RequestSample   `json:"samples,omitempty"`
}

// ScenarioReport holds metrics per scenario
type ScenarioReport struct {
	Name         string          `json:"name"`
	VirtualUsers int             `json:"virtual_users"`
	Duration     time.Duration   `json:"duration"`
	TotalReqs    int64           `json:"total_requests"`
	SuccessReqs  int64           `json:"success_requests"`
	FailedReqs   int64           `json:"failed_requests"`
	AvgLatency   time.Duration   `json:"avg_latency"`
	MinLatency   time.Duration   `json:"min_latency"`
	MaxLatency   time.Duration   `json:"max_latency"`
	P50Latency   time.Duration   `json:"p50_latency"`
	P90Latency   time.Duration   `json:"p90_latency"`
	P95Latency   time.Duration   `json:"p95_latency"`
	P99Latency   time.Duration   `json:"p99_latency"`
	RPS          float64         `json:"requests_per_second"`
	BytesIn      int64           `json:"bytes_in"`
	BytesOut     int64           `json:"bytes_out"`
	Requests     []RequestReport `json:"requests"`
}

// RequestReport holds metrics per request definition
type RequestReport struct {
	Name        string        `json:"name"`
	Method      string        `json:"method"`
	URL         string        `json:"url"`
	Count       int64         `json:"count"`
	Success     int64         `json:"success"`
	Failed      int64         `json:"failed"`
	SuccessRate float64       `json:"success_rate"`
	AvgLatency  time.Duration `json:"avg_latency"`
	MinLatency  time.Duration `json:"min_latency"`
	MaxLatency  time.Duration `json:"max_latency"`
	P50Latency  time.Duration `json:"p50_latency"`
	P90Latency  time.Duration `json:"p90_latency"`
	P95Latency  time.Duration `json:"p95_latency"`
	P99Latency  time.Duration `json:"p99_latency"`
}

// ThresholdResult represents evaluated SLA threshold pass/fail
type ThresholdResult struct {
	Metric   string  `json:"metric"`
	Operator string  `json:"operator"`
	Expected float64 `json:"expected"`
	Actual   float64 `json:"actual"`
	Unit     string  `json:"unit"`
	Passed   bool    `json:"passed"`
	Message  string  `json:"message"`
}

