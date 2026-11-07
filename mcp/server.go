package mcp

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// StartServer initializes and executes the GoMeter MCP server
func StartServer(ctx context.Context, transport string, port string) error {
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "gometer",
		Version: "1.3.0",
	}, nil)

	// Register tools, resources, and prompts
	registerTools(server)
	registerResources(server)
	registerPrompts(server)

	switch transport {
	case "stdio":
		log.Println("GoMeter MCP server running on stdio transport...")
		return server.Run(ctx, &mcp.StdioTransport{})

	case "http":
		addr := ":" + port
		log.Printf("GoMeter MCP server running on HTTP streamable transport at http://localhost%s/mcp\n", addr)
		handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
			return server
		}, nil)

		mux := http.NewServeMux()
		mux.Handle("/mcp", handler)
		mux.Handle("/mcp/", handler)
		mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("OK"))
		})

		httpServer := &http.Server{
			Addr:    addr,
			Handler: mux,
		}

		go func() {
			<-ctx.Done()
			_ = httpServer.Shutdown(context.Background())
		}()

		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("HTTP MCP server failed: %w", err)
		}
		return nil

	default:
		return fmt.Errorf("unsupported transport '%s' (use 'stdio' or 'http')", transport)
	}
}

// WriteClientConfigJSON prints sample client configuration for IDEs and LLM clients
func WriteClientConfigJSON() string {
	execPath, err := os.Executable()
	if err != nil {
		execPath = "gometer"
	}

	return fmt.Sprintf(`{
  "mcpServers": {
    "gometer": {
      "command": %q,
      "args": ["mcp"]
    }
  }
}`, execPath)
}

