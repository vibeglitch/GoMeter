package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/naveen/gometer/pkg/config"
	"github.com/naveen/gometer/pkg/metrics"
	"github.com/naveen/gometer/pkg/runner"
	"gopkg.in/yaml.v3"
)

// RunTestArgs parameters for run_test tool
type RunTestArgs struct {
	FilePath string `json:"file_path" jsonschema:"Absolute or relative path to the GoMeter YAML test plan"`
	Format   string `json:"format,omitempty" jsonschema:"Output format: json or summary (default: json)"`
}

// ValidateTestArgs parameters for validate_test tool
type ValidateTestArgs struct {
	FilePath string `json:"file_path" jsonschema:"Path to the GoMeter YAML test plan to validate"`
}

// CreateTestArgs parameters for create_test tool
type CreateTestArgs struct {
	Name         string `json:"name" jsonschema:"Descriptive name for the test plan"`
	BaseURL      string `json:"base_url" jsonschema:"Base URL e.g. https://api.example.com"`
	Path         string `json:"path" jsonschema:"Request path e.g. /users or /v1/products"`
	Method       string `json:"method,omitempty" jsonschema:"HTTP Method: GET POST PUT DELETE (default GET)"`
	VirtualUsers int    `json:"virtual_users,omitempty" jsonschema:"Number of concurrent virtual users (default 5)"`
	Duration     string `json:"duration,omitempty" jsonschema:"Test duration e.g. 10s or 1m (default 10s)"`
	OutputFile   string `json:"output_file,omitempty" jsonschema:"Optional file path to save the generated YAML"`
}

// AnalyzeResultsArgs parameters for analyze_results tool
type AnalyzeResultsArgs struct {
	ReportFile string `json:"report_file" jsonschema:"Path to the GoMeter JSON report file"`
}

// ListTestsArgs parameters for list_tests tool
type ListTestsArgs struct {
	Directory string `json:"directory,omitempty" jsonschema:"Directory to search for test plans (default current dir)"`
}

func registerTools(server *mcp.Server) {
	// Tool 1: run_test
	mcp.AddTool(server, &mcp.Tool{
		Name:        "run_test",
		Description: "Execute a GoMeter API or load test plan from a YAML file and return performance results",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args RunTestArgs) (*mcp.CallToolResult, any, error) {
		plan, err := config.LoadFromFile(args.FilePath)
		if err != nil {
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("Failed to load test plan: %v", err)},
				},
			}, nil, nil
		}

		r, err := runner.NewRunner(plan, nil)
		if err != nil {
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("Failed to initialize runner: %v", err)},
				},
			}, nil, nil
		}

		report, err := r.Run(ctx)
		if err != nil {
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("Test execution failed: %v", err)},
				},
			}, nil, nil
		}

		var outputText string
		if strings.ToLower(args.Format) == "summary" {
			outputText = fmt.Sprintf("=== GoMeter Test Results: %s ===\n"+
				"Status: %s\n"+
				"Total Requests: %d\n"+
				"Success Rate: %.2f%%\n"+
				"Throughput: %.2f req/s\n"+
				"Avg Latency: %v\n"+
				"p95 Latency: %v\n"+
				"p99 Latency: %v\n",
				report.TestName,
				map[bool]string{true: "PASSED", false: "FAILED"}[report.Passed],
				report.TotalReqs,
				100.0-report.ErrorRate,
				report.RPS,
				report.AvgLatency,
				report.P95Latency,
				report.P99Latency,
			)
		} else {
			data, _ := json.MarshalIndent(report, "", "  ")
			outputText = string(data)
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: outputText},
			},
		}, nil, nil
	})

	// Tool 2: validate_test
	mcp.AddTool(server, &mcp.Tool{
		Name:        "validate_test",
		Description: "Validate a GoMeter YAML test plan for syntax, configuration, and required fields",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args ValidateTestArgs) (*mcp.CallToolResult, any, error) {
		plan, err := config.LoadFromFile(args.FilePath)
		if err != nil {
			return &mcp.CallToolResult{
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("❌ Validation failed:\n%v", err)},
				},
			}, nil, nil
		}

		summary := fmt.Sprintf("✅ Test plan '%s' is valid!\n"+
			"- Base URL: %s\n"+
			"- Scenarios: %d\n"+
			"- Total Virtual Users: %d\n",
			plan.Name, plan.BaseURL, len(plan.Scenarios), totalVUs(plan))

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: summary},
			},
		}, nil, nil
	})

	// Tool 3: create_test
	mcp.AddTool(server, &mcp.Tool{
		Name:        "create_test",
		Description: "Create a new GoMeter YAML test plan with best practice load testing defaults",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args CreateTestArgs) (*mcp.CallToolResult, any, error) {
		vus := args.VirtualUsers
		if vus <= 0 {
			vus = 5
		}
		durationStr := args.Duration
		if durationStr == "" {
			durationStr = "10s"
		}
		duration, err := time.ParseDuration(durationStr)
		if err != nil {
			duration = 10 * time.Second
		}
		method := strings.ToUpper(args.Method)
		if method == "" {
			method = "GET"
		}
		path := args.Path
		if path == "" {
			path = "/"
		}

		plan := config.TestPlan{
			Name:        args.Name,
			Description: fmt.Sprintf("Auto-generated GoMeter test plan for %s", args.BaseURL),
			BaseURL:     args.BaseURL,
			Defaults: config.Defaults{
				Headers: map[string]string{
					"Content-Type": "application/json",
					"Accept":       "application/json",
				},
				Timeout: 10 * time.Second,
			},
			Scenarios: []config.Scenario{
				{
					Name:         "Standard Load",
					VirtualUsers: vus,
					Duration:     duration,
					RampUp:       duration / 4,
					Requests: []config.Request{
						{
							Name:   fmt.Sprintf("%s %s", method, path),
							Method: method,
							Path:   path,
							Assertions: []config.Assertion{
								{Type: "status", Expected: "200"},
								{Type: "latency", Expected: "<1000ms"},
							},
						},
					},
					Thresholds: []config.Threshold{
						{Metric: "p95_latency", Operator: "<", Value: 1000, Unit: "ms"},
						{Metric: "error_rate", Operator: "<", Value: 1.0, Unit: "%"},
					},
				},
			},
		}

		yamlData, err := yaml.Marshal(&plan)
		if err != nil {
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("Failed to generate YAML: %v", err)},
				},
			}, nil, nil
		}

		if args.OutputFile != "" {
			_ = os.WriteFile(args.OutputFile, yamlData, 0644)
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: string(yamlData)},
			},
		}, nil, nil
	})

	// Tool 4: analyze_results
	mcp.AddTool(server, &mcp.Tool{
		Name:        "analyze_results",
		Description: "Analyze a GoMeter test report, detecting latency bottlenecks, error spikes, and SLA compliance",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args AnalyzeResultsArgs) (*mcp.CallToolResult, any, error) {
		data, err := os.ReadFile(args.ReportFile)
		if err != nil {
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("Failed to read report: %v", err)},
				},
			}, nil, nil
		}

		var report metrics.Report
		if err := json.Unmarshal(data, &report); err != nil {
			return &mcp.CallToolResult{
				IsError: true,
				Content: []mcp.Content{
					&mcp.TextContent{Text: fmt.Sprintf("Failed to parse JSON report: %v", err)},
				},
			}, nil, nil
		}

		analysis := performAnalysis(&report)
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: analysis},
			},
		}, nil, nil
	})

	// Tool 5: list_tests
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_tests",
		Description: "Discover all GoMeter YAML test plans in the workspace",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args ListTestsArgs) (*mcp.CallToolResult, any, error) {
		dir := args.Directory
		if dir == "" {
			dir = "."
		}

		var found []string
		_ = filepath.Walk(dir, func(p string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if !info.IsDir() && (strings.HasSuffix(p, ".yaml") || strings.HasSuffix(p, ".yml")) {
				// Fast check if it looks like a gometer plan
				content, rErr := os.ReadFile(p)
				if rErr == nil && strings.Contains(string(content), "base_url") && strings.Contains(string(content), "scenarios") {
					found = append(found, p)
				}
			}
			return nil
		})

		respStr := fmt.Sprintf("Found %d GoMeter test plan(s):\n", len(found))
		for _, f := range found {
			respStr += fmt.Sprintf(" - %s\n", f)
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: respStr},
			},
		}, nil, nil
	})
}

func totalVUs(plan *config.TestPlan) int {
	tot := 0
	for _, s := range plan.Scenarios {
		tot += s.VirtualUsers
	}
	return tot
}

func performAnalysis(r *metrics.Report) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("=== GoMeter AI Bottleneck Analysis: %s ===\n\n", r.TestName))

	// Health check
	if r.Passed {
		b.WriteString("Overall Health: HEALTHY (All SLAs Met)\n")
	} else {
		b.WriteString("Overall Health: AT RISK (One or more SLAs Breached)\n")
	}

	b.WriteString(fmt.Sprintf("- Throughput: %.2f requests/sec\n", r.RPS))
	b.WriteString(fmt.Sprintf("- Error Rate: %.2f%%\n", r.ErrorRate))
	b.WriteString(fmt.Sprintf("- Latency Percentiles: p50=%v | p95=%v | p99=%v | Max=%v\n\n",
		r.P50Latency, r.P95Latency, r.P99Latency, r.MaxLatency))

	// Slowest requests
	b.WriteString("Endpoint Observations:\n")
	for _, sc := range r.Scenarios {
		for _, req := range sc.Requests {
			if req.P95Latency > 500*time.Millisecond {
				b.WriteString(fmt.Sprintf("  ⚠️ HIGH LATENCY: '%s' (%s) p95 is %v\n", req.Name, req.Method, req.P95Latency))
			}
			if req.Failed > 0 {
				b.WriteString(fmt.Sprintf("  🔴 ERRORS DETECTED: '%s' has %d failed requests (%.1f%% success)\n", req.Name, req.Failed, req.SuccessRate))
			}
		}
	}

	// Recommendations
	b.WriteString("\nActionable Recommendations:\n")
	if r.ErrorRate > 1.0 {
		b.WriteString("1. Investigate server-side logs for HTTP 5xx errors or connection drops.\n")
	}
	if r.P99Latency > 1*time.Second {
		b.WriteString("2. Optimize database queries or caching layers for outlier requests (p99 > 1s).\n")
	}
	if r.Passed && r.ErrorRate == 0 {
		b.WriteString("1. Performance meets baseline requirements. Consider running stress tests with 2x-5x virtual users to identify breaking limits.\n")
	}

	return b.String()
}
