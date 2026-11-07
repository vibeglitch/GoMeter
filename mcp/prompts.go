package mcp

import (
	"context"
	"fmt"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerPrompts(server *mcp.Server) {
	// Prompt 1: generate_load_test
	server.AddPrompt(&mcp.Prompt{
		Name:        "generate_load_test",
		Description: "Prompt template for generating a complete GoMeter test plan for a target API",
		Arguments: []*mcp.PromptArgument{
			{Name: "target_url", Description: "The API endpoint or service base URL", Required: true},
			{Name: "concurrency", Description: "Target concurrent users (e.g. 50)", Required: false},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		targetURL := req.Params.Arguments["target_url"]
		concurrency := req.Params.Arguments["concurrency"]
		if concurrency == "" {
			concurrency = "10"
		}

		promptText := fmt.Sprintf(`You are a performance engineering expert.
Create a production-ready GoMeter test plan YAML file for target API: %s
Concurrency: %s virtual users.

Include:
1. Base URL configuration and JSON headers
2. Realistic user flow: GET collection -> POST resource -> GET single resource
3. Assertions for HTTP status (200, 201), JSON field presence, and p95 latency under 500ms
4. Thresholds for p95_latency and error_rate
Output ONLY valid YAML.`, targetURL, concurrency)

		return &mcp.GetPromptResult{
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 2: diagnose_bottleneck
	server.AddPrompt(&mcp.Prompt{
		Name:        "diagnose_bottleneck",
		Description: "Diagnose latency degradation and failures from a GoMeter test result",
		Arguments: []*mcp.PromptArgument{
			{Name: "report_path", Description: "Path to report JSON", Required: true},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		reportPath := req.Params.Arguments["report_path"]
		promptText := fmt.Sprintf(`Please analyze the GoMeter report located at: %s
Call the tool 'analyze_results' with file_path '%s' and provide:
1. Root cause analysis of any latency spikes
2. Which endpoints degraded first under load
3. Suggested system tuning (connection pools, database queries, thread pool capacity)`, reportPath, reportPath)

		return &mcp.GetPromptResult{
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})
}
