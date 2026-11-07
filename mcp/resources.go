package mcp

import (
	"context"
	"fmt"
	"os"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerResources(server *mcp.Server) {
	// Resource: Test Plan YAML Schema Specification
	server.AddResource(&mcp.Resource{
		Name:        "Test Plan Schema",
		Description: "GoMeter YAML Test Plan syntax specification and documentation",
		MIMEType:    "text/markdown",
		URI:         "gometer://docs/spec",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		doc := `# GoMeter Test Plan Specification

A GoMeter test plan is a YAML document containing:
- name: (required) Test suite identifier
- base_url: (required) Target host (e.g. https://api.mysite.com)
- variables:
    inline: key/value pairs
    csv: [{ name: users, file: "./users.csv" }]
- defaults:
    headers: common HTTP headers
    timeout: 30s
    auth: { type: "bearer", token: "${env:API_TOKEN}" }
- scenarios:
    - name: User Journey
      virtual_users: 10
      duration: 30s
      ramp_up: 5s
      requests:
        - name: Get Profile
          method: GET
          path: /api/profile
          assertions:
            - type: status
              expected: "200"
            - type: latency
              expected: "<500ms"
`
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      "gometer://docs/spec",
					MIMEType: "text/markdown",
					Text:     doc,
				},
			},
		}, nil
	})

	// Resource: Latest Test Report
	server.AddResource(&mcp.Resource{
		Name:        "Latest Test Report",
		Description: "Most recently generated GoMeter JSON execution report in reports/latest.json",
		MIMEType:    "application/json",
		URI:         "gometer://reports/latest",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		reportPath := "reports/latest.json"
		data, err := os.ReadFile(reportPath)
		if err != nil {
			return nil, fmt.Errorf("no recent report found at %s: %w", reportPath, err)
		}
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      "gometer://reports/latest",
					MIMEType: "application/json",
					Text:     string(data),
				},
			},
		}, nil
	})
}
