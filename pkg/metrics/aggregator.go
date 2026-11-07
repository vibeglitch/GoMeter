package metrics

import (
	"math"
	"sort"
	"time"

	"github.com/HdrHistogram/hdrhistogram-go"
	"github.com/naveen/gometer/pkg/config"
)

// Aggregator calculates statistical distributions from raw metrics
type Aggregator struct {
	histTotal     *hdrhistogram.Histogram
	histScenario  map[string]*hdrhistogram.Histogram
	histRequest   map[string]*hdrhistogram.Histogram
	reqTotal      int64
	reqSuccess    int64
	reqFailed     int64
	bytesIn       int64
	bytesOut      int64
	startTime     time.Time
	endTime       time.Time
	scenarioStats map[string]*scenarioStat
	requestStats  map[string]*requestStat
	samples       []RequestSample
}

type scenarioStat struct {
	virtualUsers int
	totalReqs    int64
	successReqs  int64
	failedReqs   int64
	bytesIn      int64
	bytesOut     int64
	latencies    []int64
}

type requestStat struct {
	method    string
	url       string
	total     int64
	success   int64
	failed    int64
	latencies []int64
}

// NewAggregator creates a new metrics aggregator
func NewAggregator() *Aggregator {
	// Tracks 1 microsecond to 1 hour with 3 significant figures
	hist := hdrhistogram.New(1, 3600000000, 3)
	return &Aggregator{
		histTotal:     hist,
		histScenario:  make(map[string]*hdrhistogram.Histogram),
		histRequest:   make(map[string]*hdrhistogram.Histogram),
		scenarioStats: make(map[string]*scenarioStat),
		requestStats:  make(map[string]*requestStat),
	}
}

// Record ingests a single RequestMetric
func (a *Aggregator) Record(m RequestMetric) {
	if a.startTime.IsZero() || m.Timestamp.Before(a.startTime) {
		a.startTime = m.Timestamp
	}
	if m.Timestamp.After(a.endTime) {
		a.endTime = m.Timestamp
	}

	micros := m.Latency.Microseconds()
	if micros < 1 {
		micros = 1
	}

	a.reqTotal++
	if m.Passed {
		a.reqSuccess++
	} else {
		a.reqFailed++
	}
	a.bytesIn += m.BytesIn
	a.bytesOut += m.BytesOut
	_ = a.histTotal.RecordValue(micros)

	// Scenario stats
	sStat, ok := a.scenarioStats[m.ScenarioName]
	if !ok {
		sStat = &scenarioStat{}
		a.scenarioStats[m.ScenarioName] = sStat
		a.histScenario[m.ScenarioName] = hdrhistogram.New(1, 3600000000, 3)
	}
	sStat.totalReqs++
	if m.Passed {
		sStat.successReqs++
	} else {
		sStat.failedReqs++
	}
	sStat.bytesIn += m.BytesIn
	sStat.bytesOut += m.BytesOut
	sStat.latencies = append(sStat.latencies, micros)
	_ = a.histScenario[m.ScenarioName].RecordValue(micros)

	// Request stats
	reqKey := m.ScenarioName + "::" + m.RequestName
	rStat, ok := a.requestStats[reqKey]
	if !ok {
		rStat = &requestStat{method: m.Method, url: m.URL}
		a.requestStats[reqKey] = rStat
		a.histRequest[reqKey] = hdrhistogram.New(1, 3600000000, 3)
	}
	rStat.total++
	if m.Passed {
		rStat.success++
	} else {
		rStat.failed++
	}
	rStat.latencies = append(rStat.latencies, micros)
	_ = a.histRequest[reqKey].RecordValue(micros)

	// Keep up to 100 sample requests for UX inspection (prioritizing failed requests)
	if len(a.samples) < 100 || !m.Passed {
		sample := RequestSample{
			Timestamp:       m.Timestamp,
			ScenarioName:    m.ScenarioName,
			RequestName:     m.RequestName,
			Method:          m.Method,
			URL:             m.URL,
			StatusCode:      m.StatusCode,
			Latency:         m.Latency,
			RequestHeaders:  m.RequestHeaders,
			RequestBody:     m.RequestBody,
			ResponseHeaders: m.ResponseHeaders,
			ResponseBody:    m.ResponseBody,
			Error:           m.Error,
			Passed:          m.Passed,
			Assertions:      m.Assertions,
		}
		if len(a.samples) < 100 {
			a.samples = append(a.samples, sample)
		} else if !m.Passed {
			for i, s := range a.samples {
				if s.Passed {
					a.samples[i] = sample
					break
				}
			}
		}
	}
}

// GenerateReport produces the complete Report
func (a *Aggregator) GenerateReport(plan *config.TestPlan, now time.Time) *Report {
	if a.endTime.IsZero() {
		a.endTime = now
	}
	duration := a.endTime.Sub(a.startTime)
	if duration <= 0 {
		duration = time.Millisecond
	}

	rps := float64(a.reqTotal) / duration.Seconds()
	var errorRate float64
	if a.reqTotal > 0 {
		errorRate = (float64(a.reqFailed) / float64(a.reqTotal)) * 100.0
	}

	report := &Report{
		TestName:      plan.Name,
		Description:   plan.Description,
		StartTime:     a.startTime,
		EndTime:       a.endTime,
		Duration:      duration,
		TotalReqs:     a.reqTotal,
		SuccessReqs:   a.reqSuccess,
		FailedReqs:    a.reqFailed,
		RPS:           round(rps, 2),
		ErrorRate:     round(errorRate, 2),
		AvgLatency:    time.Duration(a.histTotal.Mean()) * time.Microsecond,
		MinLatency:    time.Duration(a.histTotal.Min()) * time.Microsecond,
		MaxLatency:    time.Duration(a.histTotal.Max()) * time.Microsecond,
		P50Latency:    time.Duration(a.histTotal.ValueAtQuantile(50)) * time.Microsecond,
		P90Latency:    time.Duration(a.histTotal.ValueAtQuantile(90)) * time.Microsecond,
		P95Latency:    time.Duration(a.histTotal.ValueAtQuantile(95)) * time.Microsecond,
		P99Latency:    time.Duration(a.histTotal.ValueAtQuantile(99)) * time.Microsecond,
		TotalBytesIn:  a.bytesIn,
		TotalBytesOut: a.bytesOut,
		Passed:        true,
		Samples:       a.samples,
	}

	// Build scenario reports
	for _, sc := range plan.Scenarios {
		sReport := ScenarioReport{
			Name:         sc.Name,
			VirtualUsers: sc.VirtualUsers,
			Duration:     sc.Duration,
		}

		sStat := a.scenarioStats[sc.Name]
		sHist := a.histScenario[sc.Name]
		if sStat != nil && sHist != nil && sStat.totalReqs > 0 {
			sReport.TotalReqs = sStat.totalReqs
			sReport.SuccessReqs = sStat.successReqs
			sReport.FailedReqs = sStat.failedReqs
			sReport.BytesIn = sStat.bytesIn
			sReport.BytesOut = sStat.bytesOut
			sReport.AvgLatency = time.Duration(sHist.Mean()) * time.Microsecond
			sReport.MinLatency = time.Duration(sHist.Min()) * time.Microsecond
			sReport.MaxLatency = time.Duration(sHist.Max()) * time.Microsecond
			sReport.P50Latency = time.Duration(sHist.ValueAtQuantile(50)) * time.Microsecond
			sReport.P90Latency = time.Duration(sHist.ValueAtQuantile(90)) * time.Microsecond
			sReport.P95Latency = time.Duration(sHist.ValueAtQuantile(95)) * time.Microsecond
			sReport.P99Latency = time.Duration(sHist.ValueAtQuantile(99)) * time.Microsecond
			sReport.RPS = round(float64(sStat.totalReqs)/duration.Seconds(), 2)

			// Requests in this scenario
			for _, req := range sc.Requests {
				reqKey := sc.Name + "::" + req.Name
				rStat := a.requestStats[reqKey]
				rHist := a.histRequest[reqKey]
				rReport := RequestReport{
					Name:   req.Name,
					Method: req.Method,
					URL:    req.Path,
				}
				if rStat != nil && rHist != nil && rStat.total > 0 {
					rReport.Count = rStat.total
					rReport.Success = rStat.success
					rReport.Failed = rStat.failed
					rReport.SuccessRate = round((float64(rStat.success)/float64(rStat.total))*100, 2)
					rReport.AvgLatency = time.Duration(rHist.Mean()) * time.Microsecond
					rReport.MinLatency = time.Duration(rHist.Min()) * time.Microsecond
					rReport.MaxLatency = time.Duration(rHist.Max()) * time.Microsecond
					rReport.P50Latency = time.Duration(rHist.ValueAtQuantile(50)) * time.Microsecond
					rReport.P90Latency = time.Duration(rHist.ValueAtQuantile(90)) * time.Microsecond
					rReport.P95Latency = time.Duration(rHist.ValueAtQuantile(95)) * time.Microsecond
					rReport.P99Latency = time.Duration(rHist.ValueAtQuantile(99)) * time.Microsecond
				}
				sReport.Requests = append(sReport.Requests, rReport)
			}
		}
		report.Scenarios = append(report.Scenarios, sReport)

		// Evaluate thresholds for this scenario
		for _, th := range sc.Thresholds {
			res := evaluateThreshold(th, sReport, report)
			report.Thresholds = append(report.Thresholds, res)
			if !res.Passed {
				report.Passed = false
			}
		}
	}

	// Evaluate plan-level thresholds
	for _, th := range plan.Thresholds {
		res := evaluatePlanThreshold(th, report)
		report.Thresholds = append(report.Thresholds, res)
		if !res.Passed {
			report.Passed = false
		}
	}

	return report
}

func evaluatePlanThreshold(th config.Threshold, report *Report) ThresholdResult {
	res := ThresholdResult{
		Metric:   th.Metric,
		Operator: th.Operator,
		Expected: th.Value,
		Unit:     th.Unit,
	}

	var actual float64
	switch th.Metric {
	case "p95_latency":
		actual = float64(report.P95Latency.Milliseconds())
	case "p99_latency":
		actual = float64(report.P99Latency.Milliseconds())
	case "avg_latency":
		actual = float64(report.AvgLatency.Milliseconds())
	case "error_rate":
		actual = report.ErrorRate
	case "rps":
		actual = report.RPS
	}

	res.Actual = round(actual, 2)

	switch th.Operator {
	case "<":
		res.Passed = actual < th.Value
	case "<=":
		res.Passed = actual <= th.Value
	case ">":
		res.Passed = actual > th.Value
	case ">=":
		res.Passed = actual >= th.Value
	}

	if res.Passed {
		res.Message = "PASSED"
	} else {
		res.Message = "FAILED"
	}

	return res
}

func evaluateThreshold(th config.Threshold, sReport ScenarioReport, report *Report) ThresholdResult {
	res := ThresholdResult{
		Metric:   th.Metric,
		Operator: th.Operator,
		Expected: th.Value,
		Unit:     th.Unit,
	}

	var actual float64
	switch th.Metric {
	case "p95_latency":
		actual = float64(sReport.P95Latency.Milliseconds())
	case "p99_latency":
		actual = float64(sReport.P99Latency.Milliseconds())
	case "avg_latency":
		actual = float64(sReport.AvgLatency.Milliseconds())
	case "error_rate":
		if sReport.TotalReqs > 0 {
			actual = (float64(sReport.FailedReqs) / float64(sReport.TotalReqs)) * 100
		}
	case "rps":
		actual = sReport.RPS
	}

	res.Actual = round(actual, 2)

	switch th.Operator {
	case "<":
		res.Passed = actual < th.Value
	case "<=":
		res.Passed = actual <= th.Value
	case ">":
		res.Passed = actual > th.Value
	case ">=":
		res.Passed = actual >= th.Value
	}

	if res.Passed {
		res.Message = "PASSED"
	} else {
		res.Message = "FAILED"
	}

	return res
}

func round(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}

func percentile(sorted []int64, p float64) int64 {
	if len(sorted) == 0 {
		return 0
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	idx := int(math.Ceil(float64(len(sorted))*(p/100.0))) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}

