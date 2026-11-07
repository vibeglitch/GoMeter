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
1. **Explorer Sidebar**: Browse, inspect, and run test plans directly from the Activity Bar.
2. **Live Dashboard & Controls**: Real-time throughput (RPS), full-width latency timeline, and a **`⏹ Stop Test`** button to safely abort running tests.
3. **Live Request & Response Inspector**: Click any row in the live execution table to inspect full request headers, payload body, response headers, syntax-highlighted response body, and assertion validation checklists.
4. **AI Generation**: Generate complete test plans from natural language prompts using IDE LLMs (`vscode.lm`).
5. **AI Bottleneck Analysis**: Ask LLMs to diagnose test results and suggest backend optimizations.
6. **Self-Contained (Zero Dependencies)**: Bundles static standalone precompiled binaries for Linux and Windows—users do **not** need Go, Node.js, or npm installed.

### Install VSIX

```bash
# Install the latest self-contained extension (v1.1.0)
code --install-extension release/v1.1.0/gometer-1.1.0.vsix
```

All releases and historical versions are preserved in the [`release/`](release/) directory.

---

## Versioning Standards

GoMeter strictly adheres to [Semantic Versioning (SemVer 2.0.0)](https://semver.org/).
All components (Go CLI, MCP Server, and VS Code Extension) are kept synchronized on the identical version string (`MAJOR.MINOR.PATCH`).
See [VERSIONING.md](VERSIONING.md) for full version increment rules and pre-release checklists.

