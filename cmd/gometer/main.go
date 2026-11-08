package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/fatih/color"
	"github.com/naveen/gometer/mcp"
	"github.com/naveen/gometer/pkg/config"
	"github.com/naveen/gometer/pkg/importer"
	"github.com/naveen/gometer/pkg/metrics"
	"github.com/naveen/gometer/pkg/reporter"
	"github.com/naveen/gometer/pkg/runner"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

var (
	version   = "1.3.1"
	outputFmt string
	reportDir string
	verbose   bool
	transport string
	port      string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "gometer",
		Short: "GoMeter - High-performance API and load testing tool in Go",
		Long: `GoMeter is a modern, blazing fast, Go-powered alternative to JMeter.
It features YAML test plans, lightweight goroutines for thousands of virtual users,
native Model Context Protocol (MCP) support, and first-class VS Code integration.`,
	}

	// 1. run command
	runCmd := &cobra.Command{
		Use:   "run [test-plan.yaml]",
		Short: "Execute an API load or functional test plan",
		Args:  cobra.ExactArgs(1),
		RunE:  executeRun,
	}
	runCmd.Flags().StringVarP(&outputFmt, "output", "o", "console", "Output format: console, json, html, or all")
	runCmd.Flags().StringVarP(&reportDir, "report-dir", "r", "./reports", "Output directory for generated reports")
	runCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Print real-time live request results to stdout")

	// 2. validate command
	validateCmd := &cobra.Command{
		Use:   "validate [test-plan.yaml]",
		Short: "Validate syntax and schema of a test plan without running it",
		Args:  cobra.ExactArgs(1),
		RunE:  executeValidate,
	}

	// 3. mcp command
	mcpCmd := &cobra.Command{
		Use:   "mcp",
		Short: "Start the GoMeter Model Context Protocol (MCP) server",
		Long: `Starts the GoMeter MCP server to expose test execution, creation, and result analysis
tools to LLMs (Claude, VS Code Copilot, Cursor).`,
		RunE: executeMCP,
	}
	mcpCmd.Flags().StringVarP(&transport, "transport", "t", "stdio", "MCP transport: stdio or http")
	mcpCmd.Flags().StringVarP(&port, "port", "p", "8080", "Port when using http transport")

	// 4. init command
	initCmd := &cobra.Command{
		Use:   "init [filename.yaml]",
		Short: "Generate a template GoMeter test plan YAML file",
		Args:  cobra.MaximumNArgs(1),
		RunE:  executeInit,
	}

	// 5. import command
	var curlCmdStr string
	var postmanFile string
	var importOutFile string
	importCmd := &cobra.Command{
		Use:   "import",
		Short: "Import test plans from external formats (cURL or Postman Collection v2.1)",
		RunE: func(cmd *cobra.Command, args []string) error {
			var plan *config.TestPlan
			var err error

			if postmanFile != "" {
				plan, err = importer.FromPostman(postmanFile)
				if err != nil {
					return fmt.Errorf("postman import failed: %w", err)
				}
			} else if curlCmdStr != "" {
				plan, err = importer.FromCurl(curlCmdStr, "")
				if err != nil {
					return fmt.Errorf("curl import failed: %w", err)
				}
			} else {
				return fmt.Errorf("must specify either --curl '<curl_command>' or --postman '<path/to/collection.json>'")
			}

			yamlBytes, err := importer.PlanToYAML(plan)
			if err != nil {
				return fmt.Errorf("serialization failed: %w", err)
			}
			if importOutFile != "" {
				if err := os.WriteFile(importOutFile, yamlBytes, 0644); err != nil {
					return err
				}
				fmt.Printf("✅ Imported test plan saved to %s\n", importOutFile)
			} else {
				fmt.Println(string(yamlBytes))
			}
			return nil
		},
	}
	importCmd.Flags().StringVar(&curlCmdStr, "curl", "", "cURL command string to convert into a GoMeter YAML test plan")
	importCmd.Flags().StringVar(&postmanFile, "postman", "", "Path to Postman Collection v2.1 JSON file to convert")
	importCmd.Flags().StringVarP(&importOutFile, "output", "o", "", "Destination file path for generated YAML")

	// 6. history command
	historyCmd := &cobra.Command{
		Use:   "history",
		Short: "Display historical test runs",
		Run: func(cmd *cobra.Command, args []string) {
			displayHistory(reportDir)
		},
	}
	historyCmd.Flags().StringVar(&reportDir, "report-dir", "./reports", "Directory where reports are stored")

	// 7. version command
	versionCmd := &cobra.Command{
		Use:   "version",
		Short: "Print GoMeter version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("GoMeter v%s (built with %s on %s/%s)\n", version, "Go 1.25", "linux", "amd64")
		},
	}

	rootCmd.AddCommand(runCmd, validateCmd, mcpCmd, initCmd, importCmd, historyCmd, versionCmd)

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func executeRun(cmd *cobra.Command, args []string) error {
	planPath := args[0]
	plan, err := config.LoadFromFile(planPath)
	if err != nil {
		return fmt.Errorf("failed to load test plan: %w", err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	var liveCallback metrics.LiveCallback
	if verbose && outputFmt == "console" {
		liveCallback = func(m metrics.RequestMetric) {
			statusTag := color.GreenString("[%d]", m.StatusCode)
			if m.StatusCode >= 400 || !m.Passed {
				statusTag = color.RedString("[%d]", m.StatusCode)
			}
			fmt.Fprintf(os.Stderr, "  VU #%d | %s %-6s %-30s in %v\n",
				m.UserID, statusTag, m.Method, m.RequestName, m.Latency.Round(time.Microsecond))
		}
	} else if outputFmt == "json" && verbose {
		// Output newline-delimited JSON stream for IDEs/Webview
		liveCallback = func(m metrics.RequestMetric) {
			live := metrics.LiveMetric{
				Type:            "metric",
				Timestamp:       m.Timestamp,
				ScenarioName:    m.ScenarioName,
				RequestName:     m.RequestName,
				Method:          m.Method,
				URL:             m.URL,
				LatencyMs:       float64(m.Latency.Microseconds()) / 1000.0,
				StatusCode:      m.StatusCode,
				Success:         m.Passed,
				RequestHeaders:  m.RequestHeaders,
				RequestBody:     m.RequestBody,
				ResponseHeaders: m.ResponseHeaders,
				ResponseBody:    m.ResponseBody,
				Assertions:      m.Assertions,
				Error:           m.Error,
			}
			data, _ := json.Marshal(live)
			fmt.Println(string(data))
		}
	}

	if outputFmt != "json" {
		fmt.Printf("\n🚀 Launching GoMeter test: %s\n", color.CyanString(plan.Name))
		fmt.Printf("   Target: %s\n", plan.BaseURL)
		for _, s := range plan.Scenarios {
			fmt.Printf("   Scenario '%s': %d Virtual Users, Duration: %v, RampUp: %v\n",
				s.Name, s.VirtualUsers, s.Duration, s.RampUp)
		}
		fmt.Println("   Executing...")
	}

	r, err := runner.NewRunner(plan, liveCallback)
	if err != nil {
		return fmt.Errorf("runner initialization failed: %w", err)
	}

	report, err := r.Run(ctx)
	if err != nil {
		return fmt.Errorf("test execution error: %w", err)
	}

	// Always write reports/latest.json
	_ = os.MkdirAll(reportDir, 0755)
	latestJSON := filepath.Join(reportDir, "latest.json")
	_ = reporter.ExportJSON(report, latestJSON)

	// Save run to history
	historyDir := filepath.Join(reportDir, "history")
	_ = os.MkdirAll(historyDir, 0755)
	runID := fmt.Sprintf("run-%d", report.StartTime.Unix())
	historyFile := filepath.Join(historyDir, runID+".json")
	_ = reporter.ExportJSON(report, historyFile)
	saveHistoryIndex(historyDir, report, runID, historyFile)

	// Format output
	switch strings.ToLower(outputFmt) {
	case "json":
		if verbose {
			completeMsg := map[string]interface{}{
				"type":   "complete",
				"report": report,
			}
			data, _ := json.Marshal(completeMsg)
			fmt.Println(string(data))
		} else {
			data, _ := json.MarshalIndent(report, "", "  ")
			fmt.Println(string(data))
		}

	case "html":
		htmlPath := filepath.Join(reportDir, fmt.Sprintf("report-%d.html", time.Now().Unix()))
		if err := reporter.ExportHTML(report, htmlPath); err != nil {
			return err
		}
		fmt.Printf("\n✅ HTML report generated: %s\n", htmlPath)
		reporter.PrintConsoleReport(os.Stdout, report)

	case "all":
		reporter.PrintConsoleReport(os.Stdout, report)
		htmlPath := filepath.Join(reportDir, "report.html")
		_ = reporter.ExportHTML(report, htmlPath)
		jsonPath := filepath.Join(reportDir, "report.json")
		_ = reporter.ExportJSON(report, jsonPath)
		fmt.Printf("✅ Reports saved to %s (report.html, report.json, latest.json)\n", reportDir)

	default: // "console"
		reporter.PrintConsoleReport(os.Stdout, report)
	}

	if ctx.Err() != nil {
		if verbose && outputFmt == "json" {
			stoppedMsg := map[string]interface{}{
				"type":   "stopped",
				"report": report,
			}
			data, _ := json.Marshal(stoppedMsg)
			fmt.Println(string(data))
		}
		return nil
	}

	if !report.Passed {
		os.Exit(2) // Exit code 2 indicates SLA/Threshold failure
	}

	return nil
}

func executeValidate(cmd *cobra.Command, args []string) error {
	planPath := args[0]
	plan, err := config.LoadFromFile(planPath)
	if err != nil {
		fmt.Println(color.RedString("❌ Validation failed:\n%v", err))
		os.Exit(1)
	}

	fmt.Println(color.GreenString("✅ Test plan '%s' is valid!", plan.Name))
	fmt.Printf("   Base URL  : %s\n", plan.BaseURL)
	fmt.Printf("   Scenarios : %d\n", len(plan.Scenarios))
	for _, sc := range plan.Scenarios {
		fmt.Printf("   - %s (%d virtual users, %v duration, %d requests)\n",
			sc.Name, sc.VirtualUsers, sc.Duration, len(sc.Requests))
	}
	return nil
}

func executeMCP(cmd *cobra.Command, args []string) error {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	return mcp.StartServer(ctx, transport, port)
}

func executeInit(cmd *cobra.Command, args []string) error {
	filename := "test-plan.gometer.yaml"
	if len(args) > 0 {
		filename = args[0]
	}

	templatePlan := config.TestPlan{
		Name:        "Sample API Load Test",
		Description: "A starter GoMeter test plan for API performance testing",
		BaseURL:     "https://httpbin.org",
		Defaults: config.Defaults{
			Headers: map[string]string{
				"Content-Type": "application/json",
				"Accept":       "application/json",
			},
			Timeout: 10 * time.Second,
		},
		Scenarios: []config.Scenario{
			{
				Name:         "API Smoke Test",
				VirtualUsers: 5,
				Duration:     10 * time.Second,
				RampUp:       2 * time.Second,
				ThinkTime:    500 * time.Millisecond,
				Requests: []config.Request{
					{
						Name:   "Get JSON Data",
						Method: "GET",
						Path:   "/json",
						Assertions: []config.Assertion{
							{Type: "status", Expected: "200"},
							{Type: "latency", Expected: "<500ms"},
						},
					},
					{
						Name:   "Post Status",
						Method: "POST",
						Path:   "/post",
						Body:   `{"status": "testing", "runner": "gometer"}`,
						Assertions: []config.Assertion{
							{Type: "status", Expected: "200"},
						},
					},
				},
				Thresholds: []config.Threshold{
					{Metric: "p95_latency", Operator: "<", Value: 600, Unit: "ms"},
					{Metric: "error_rate", Operator: "<", Value: 1.0, Unit: "%"},
				},
			},
		},
	}

	data, err := yaml.Marshal(&templatePlan)
	if err != nil {
		return err
	}

	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", filename, err)
	}

	fmt.Println(color.GreenString("✅ Initialized test plan at %s", filename))
	fmt.Printf("Run it with: gometer run %s\n", filename)
	return nil
}

type HistoryEntry struct {
	ID            string    `json:"id"`
	TestName      string    `json:"test_name"`
	Timestamp     time.Time `json:"timestamp"`
	Duration      string    `json:"duration"`
	TotalRequests int64     `json:"total_requests"`
	RPS           float64   `json:"rps"`
	P95LatencyMs  float64   `json:"p95_latency_ms"`
	ErrorRate     float64   `json:"error_rate"`
	Passed        bool      `json:"passed"`
	ReportPath    string    `json:"report_path"`
}

func saveHistoryIndex(historyDir string, report *metrics.Report, runID, reportFile string) {
	indexFile := filepath.Join(historyDir, "index.json")
	var entries []HistoryEntry
	if data, err := os.ReadFile(indexFile); err == nil {
		_ = json.Unmarshal(data, &entries)
	}

	newEntry := HistoryEntry{
		ID:            runID,
		TestName:      report.TestName,
		Timestamp:     report.StartTime,
		Duration:      report.Duration.String(),
		TotalRequests: report.TotalReqs,
		RPS:           report.RPS,
		P95LatencyMs:  float64(report.P95Latency.Milliseconds()),
		ErrorRate:     report.ErrorRate,
		Passed:        report.Passed,
		ReportPath:    reportFile,
	}

	entries = append([]HistoryEntry{newEntry}, entries...)
	if len(entries) > 50 {
		entries = entries[:50]
	}

	data, err := json.MarshalIndent(entries, "", "  ")
	if err == nil {
		_ = os.WriteFile(indexFile, data, 0644)
	}
}

func displayHistory(reportDir string) {
	historyIndex := filepath.Join(reportDir, "history", "index.json")
	data, err := os.ReadFile(historyIndex)
	if err != nil {
		fmt.Printf("No test history found in %s/history\n", reportDir)
		return
	}
	var entries []HistoryEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		fmt.Printf("Failed to parse history: %v\n", err)
		return
	}
	fmt.Printf("\n📜 GoMeter Test Runs History (%d runs recorded):\n\n", len(entries))
	fmt.Printf("%-20s %-25s %-8s %-10s %-12s %s\n", "RUN ID", "TEST PLAN", "REQS", "RPS", "P95", "STATUS")
	fmt.Println(strings.Repeat("─", 85))
	for _, e := range entries {
		statusStr := color.GreenString("PASS")
		if !e.Passed {
			statusStr = color.RedString("FAIL")
		}
		name := e.TestName
		if len(name) > 24 {
			name = name[:21] + "..."
		}
		fmt.Printf("%-20s %-25s %-8d %-10.2f %-12s %s\n",
			e.ID, name, e.TotalRequests, e.RPS, fmt.Sprintf("%.1fms", e.P95LatencyMs), statusStr)
	}
	fmt.Println()
}

