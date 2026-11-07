package reporter

import (
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/naveen/gometer/pkg/metrics"
)

// PrintConsoleReport formats and writes the report to the console
func PrintConsoleReport(w io.Writer, report *metrics.Report) {
	if w == nil {
		w = os.Stdout
	}

	cyan := color.New(color.FgCyan, color.Bold).SprintFunc()
	green := color.New(color.FgGreen, color.Bold).SprintFunc()
	red := color.New(color.FgRed, color.Bold).SprintFunc()
	yellow := color.New(color.FgYellow).SprintFunc()
	bold := color.New(color.Bold).SprintFunc()

	fmt.Fprintln(w)
	fmt.Fprintln(w, cyan("═══════════════════════════════════════════════════════════════════════════"))
	fmt.Fprintf(w, "  %s %s\n", cyan("GoMeter Test Execution Summary:"), bold(report.TestName))
	if report.Description != "" {
		fmt.Fprintf(w, "  %s\n", yellow(report.Description))
	}
	fmt.Fprintln(w, cyan("═══════════════════════════════════════════════════════════════════════════"))
	fmt.Fprintln(w)

	// Summary stats
	statusStr := green("PASSED")
	if !report.Passed {
		statusStr = red("FAILED")
	}

	fmt.Fprintf(w, "  %-24s: %s\n", "Status", statusStr)
	fmt.Fprintf(w, "  %-24s: %v\n", "Duration", report.Duration.Round(time.Millisecond))
	fmt.Fprintf(w, "  %-24s: %s\n", "Total Requests", bold(fmt.Sprintf("%d", report.TotalReqs)))
	fmt.Fprintf(w, "  %-24s: %s (%.2f%%)\n", "Success Requests", green(fmt.Sprintf("%d", report.SuccessReqs)), 100.0-report.ErrorRate)
	fmt.Fprintf(w, "  %-24s: %s (%.2f%%)\n", "Failed Requests", red(fmt.Sprintf("%d", report.FailedReqs)), report.ErrorRate)
	fmt.Fprintf(w, "  %-24s: %.2f req/s\n", "Throughput", report.RPS)
	fmt.Fprintln(w)

	// Latency percentiles
	fmt.Fprintln(w, cyan("  ── Latency Distribution ─────────────────────────────────────────────────"))
	fmt.Fprintf(w, "  %-12s: %-10v  |  %-12s: %-10v\n", "Min", report.MinLatency.Round(time.Microsecond), "Avg", report.AvgLatency.Round(time.Microsecond))
	fmt.Fprintf(w, "  %-12s: %-10v  |  %-12s: %-10v\n", "p50 (Median)", report.P50Latency.Round(time.Microsecond), "p90", report.P90Latency.Round(time.Microsecond))
	fmt.Fprintf(w, "  %-12s: %-10v  |  %-12s: %-10v\n", "p95", report.P95Latency.Round(time.Microsecond), "p99", report.P99Latency.Round(time.Microsecond))
	fmt.Fprintf(w, "  %-12s: %-10v\n", "Max", report.MaxLatency.Round(time.Microsecond))
	fmt.Fprintln(w)

	// Per-Request Breakdown Table
	fmt.Fprintln(w, cyan("  ── Requests Breakdown ───────────────────────────────────────────────────"))
	fmt.Fprintf(w, "  %-20s %-8s %-8s %-10s %-10s %-10s %-8s\n", "REQUEST", "METHOD", "COUNT", "AVG", "P95", "P99", "SUCCESS")
	fmt.Fprintln(w, "  "+strings.Repeat("─", 80))

	for _, sc := range report.Scenarios {
		for _, r := range sc.Requests {
			succStr := green(fmt.Sprintf("%.1f%%", r.SuccessRate))
			if r.SuccessRate < 100 {
				succStr = red(fmt.Sprintf("%.1f%%", r.SuccessRate))
			}
			fmt.Fprintf(w, "  %-20s %-8s %-8d %-10v %-10v %-10v %-8s\n",
				truncate(r.Name, 20),
				r.Method,
				r.Count,
				r.AvgLatency.Round(time.Microsecond),
				r.P95Latency.Round(time.Microsecond),
				r.P99Latency.Round(time.Microsecond),
				succStr,
			)
		}
	}
	fmt.Fprintln(w)

	// Thresholds / SLAs
	if len(report.Thresholds) > 0 {
		fmt.Fprintln(w, cyan("  ── Thresholds & SLAs ────────────────────────────────────────────────────"))
		for _, th := range report.Thresholds {
			tag := green("[PASS]")
			if !th.Passed {
				tag = red("[FAIL]")
			}
			fmt.Fprintf(w, "  %s %s: actual %.2f %s (expected %s %.2f %s)\n",
				tag, th.Metric, th.Actual, th.Unit, th.Operator, th.Expected, th.Unit)
		}
		fmt.Fprintln(w)
	}

	fmt.Fprintln(w, cyan("═══════════════════════════════════════════════════════════════════════════"))
	fmt.Fprintln(w)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}

