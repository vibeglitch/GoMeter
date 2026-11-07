# GoMeter

GoMeter is a high-performance, modern alternative to Apache JMeter for API and load testing, built in Go with native Model Context Protocol (MCP) support and a full-featured VS Code extension.

## Features

- ⚡ **High Concurrency**: Millions of virtual users simulated efficiently using lightweight Go goroutines instead of heavy JVM threads.
- 📄 **Declarative YAML Test Plans**: Human-readable, version-controllable test definitions with support for inline variables, environment variables, and CSV data feeds.
- 🎯 **Advanced Assertions & Data Chaining**: Validate HTTP status codes, latency thresholds, JSON paths, and headers. Extract response tokens to chain subsequent requests.
- 📊 **Rich Multi-Format Reporting**: Detailed latency percentiles (min, p50, p90, p95, p99, max), live progress, JSON exports, and standalone HTML reports with interactive Chart.js graphs.
- 🤖 **Model Context Protocol (MCP)**: Native MCP server exposing 5 tools (`run_test`, `validate_test`, `create_test`, `analyze_results`, `list_tests`), resources, and prompt templates for LLMs (Claude, VS Code Copilot, Cursor).
- 🧩 **VS Code Extension (VSIX)**: Live interactive webview dashboard, test plan tree view explorer, and AI test generation and result diagnosis using the `vscode.lm` API.

---

## Quickstart

### 1. Build GoMeter CLI

`make build` compiles the `gometer` binary into `bin/gometer`.

### 2. Initialize a Test Plan

```bash
./bin/gometer init my-test.gometer.yaml
```

### 3. Validate Test Plan

```bash
./bin/gometer validate my-test.gometer.yaml
```

### 4. Run Test Plan

```bash
# Output summary to console
./bin/gometer run my-test.gometer.yaml

# Generate standalone HTML dashboard
./bin/gometer run my-test.gometer.yaml --output html --report-dir ./reports

# Output JSON report
./bin/gometer run my-test.gometer.yaml --output json
```

---

## MCP Server

Run GoMeter as an MCP server over standard I/O (for Claude Desktop, Cursor, or VS Code):

```bash
./bin/gometer mcp
```

Or over streamable HTTP:

```bash
./bin/gometer mcp --transport http --port 8080
```

### Claude Desktop Configuration (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "gometer": {
      "command": "/absolute/path/to/bin/gometer",
      "args": ["mcp"]
    }
  }
}
```

---

## VS Code Extension (VSIX)

The VS Code extension provides:
1. **Explorer Sidebar**: Browse and run test plans directly from the activity bar.
2. **Live Dashboard**: Real-time throughput (RPS), response latency line charts, and status breakdowns.
3. **AI Generation**: Generate complete test plans from natural language prompts using Copilot.
4. **AI Bottleneck Analysis**: Ask LLMs to analyze test results and suggest backend optimizations.

### Install VSIX

```bash
code --install-extension vscode-extension/gometer-1.0.0.vsix
```

---

## Versioning Standards

GoMeter strictly adheres to [Semantic Versioning (SemVer 2.0.0)](https://semver.org/).
All components (Go CLI, MCP Server, and VS Code Extension) are kept synchronized on the identical version string (`MAJOR.MINOR.PATCH`).
See [VERSIONING.md](VERSIONING.md) for full version increment rules and pre-release checklists.

