package mcp

import (
	"context"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestMCPServer_ToolsList(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	clientTransport, serverTransport := mcp.NewInMemoryTransports()

	server := mcp.NewServer(&mcp.Implementation{Name: "gometer", Version: "1.0.0"}, nil)
	registerTools(server)
	registerResources(server)
	registerPrompts(server)

	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatalf("server.Connect failed: %v", err)
	}
	defer serverSession.Close()

	client := mcp.NewClient(&mcp.Implementation{Name: "test-client"}, nil)
	clientSession, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatalf("client.Connect failed: %v", err)
	}
	defer clientSession.Close()

	// Verify tools list
	toolsResult, err := clientSession.ListTools(ctx, nil)
	if err != nil {
		t.Fatalf("ListTools failed: %v", err)
	}

	expectedTools := map[string]bool{
		"run_test":        false,
		"validate_test":   false,
		"create_test":     false,
		"analyze_results": false,
		"list_tests":      false,
	}

	for _, tool := range toolsResult.Tools {
		if _, ok := expectedTools[tool.Name]; ok {
			expectedTools[tool.Name] = true
		}
	}

	for name, found := range expectedTools {
		if !found {
			t.Errorf("expected tool '%s' was not registered in MCP server", name)
		}
	}

	// Verify calling create_test tool
	res, err := clientSession.CallTool(ctx, &mcp.CallToolParams{
		Name: "create_test",
		Arguments: map[string]any{
			"name":     "Quick Test",
			"base_url": "https://httpbin.org",
			"path":     "/status/200",
		},
	})
	if err != nil {
		t.Fatalf("CallTool create_test failed: %v", err)
	}

	if len(res.Content) == 0 {
		t.Fatal("expected response content, got none")
	}

	txt, ok := res.Content[0].(*mcp.TextContent)
	if !ok || txt.Text == "" {
		t.Fatalf("expected text content with YAML, got %v", res.Content[0])
	}
}

