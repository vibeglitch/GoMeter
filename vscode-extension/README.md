<div align="center">

# ⚡ GoMeter

**The Modern, High-Performance Alternative to Apache JMeter**

*Engineered in Go for extreme concurrency, native Model Context Protocol (MCP) integration, and self-contained VS Code tooling.*

[![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Version](https://img.shields.io/badge/Version-1.1.0-blue?style=for-the-badge)](VERSIONING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Official%20Go%20SDK-purple?style=for-the-badge)](https://modelcontextprotocol.io)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-VSIX%20v1.1.0-007ACC?style=for-the-badge&logo=visual-studio-code)](release/v1.1.0/)

---

[Features](#-key-features) •
[Why GoMeter?](#-why-gometer-vs-jmeter) •
[Quickstart](#-quickstart) •
[MCP Server](#-model-context-protocol-mcp-server) •
[VS Code Extension](#-vs-code-extension-vsix) •
[YAML Spec](#-declarative-yaml-test-plan-specification) •
[Benchmarks](#-benchmarks--verification) •
[Releases](#-releases--versioning)

</div>

---

## 📖 Overview

**GoMeter** is a lightweight, blazing-fast API and load testing tool written from the ground up in Go. It replaces heavy Java Virtual Machine dependencies and cumbersome XML test plans (`.jmx`) with **clean declarative YAML**, **goroutine-powered concurrency**, a native **Model Context Protocol (MCP)** server for AI agent orchestration, and a **100% self-contained VS Code extension** featuring a real-time Webview dashboard and request inspector.

---

## ⚡ Key Features

- **🚀 Ultra-High Concurrency**: Millions of virtual users simulated with lightweight Go goroutines instead of heavy OS/JVM threads. Up to 10,000 pooled idle keep-alive connections.
- **📄 Declarative YAML Test Plans**: Human-readable, Git-friendly test plans supporting inline variables, `${env:VAR}` substitutions, and CSV data parameterization feeds.
- **🎯 Advanced Assertion Engine**: Validate HTTP status codes (`200`, `2xx`, `!=500`), latency limits (`<500ms`), JSONPath values (`$.id == 1`), response headers, and regex matching.
- **🔗 Request Chaining & Dynamic Extractions**: Seamlessly extract JWT tokens, IDs, or values from response headers/bodies to pass into subsequent scenario requests.
- **🔍 Live Request & Response Inspector**: Drill into any individual request in real time or post-test to inspect full request headers, payload body, response headers, syntax-highlighted response body, and assertion outcomes.
- **⏹ Test Cancellation Controls**: Stop active load tests on demand via CLI or the Webview `⏹ Stop Test` button; active workers drain gracefully and preserve collected metrics in the final report.
- **📊 HDR Histogram Analytics**: Microsecond-precision percentiles (`min`, `avg`, `p50`, `p90`, `p95`, `p99`, `max`), real-time throughput (RPS), error rates, and standalone interactive HTML reports.
- **🤖 Native Model Context Protocol (MCP)**: Built with the official `modelcontextprotocol/go-sdk`. Exposes 5 tools, 2 resources, and 2 prompts for Claude Desktop, Cursor, and VS Code Copilot.
- **🧩 100% Self-Contained VS Code Extension**: Bundles static precompiled Go binaries for Linux and Windows. No Go runtime or Node.js environment required. Includes CodeLenses, sidebar explorer, live dashboard, and `vscode.lm` AI generation.

---

## 🥊 Why GoMeter vs. JMeter?

| Feature | Apache JMeter | GoMeter ⚡ |
|:---|:---|:---|
| **Runtime Dependency** | Requires heavy Java Runtime (JRE / JDK) | **Single static binary (zero runtime dependencies)** |
| **Concurrency Model** | 1 OS thread per virtual user (high memory footprint) | **Lightweight Go Goroutines (~4KB stack per VU)** |
| **Test Plan Format** | Complex, verbose, merge-conflict-prone XML (`.jmx`) | **Clean, Git-friendly Declarative YAML** |
| **Startup Time** | 5 – 15 seconds (JVM warmup) | **< 15 milliseconds** |
| **AI / LLM Integration**| None (manual GUI configuration) | **Native Model Context Protocol (MCP) server & `vscode.lm`** |
| **IDE Integration** | Separate external Java desktop GUI | **First-class VS Code Extension with Live Webview & Inspector** |
| **Importers** | Complex plugin installation | **Built-in `curl`, `postman`, and `openapi` converters** |
| **Memory Consumption** | ~500MB – 2GB baseline | **< 30MB under thousands of VUs** |

---

## 🚀 Quickstart

### 1. Installation

#### Option A: Download Precompiled Release Binary
Download the prebuilt static binary for your architecture from the [`release/`](release/) catalog:

```bash
# Example for Linux amd64
tar -xzf release/v1.1.0/gometer-v1.1.0-linux-amd64.tar.gz
sudo mv gometer /usr/local/bin/
```

#### Option B: Build from Source
```bash
git clone https://github.com/vibeglitch/GoMeter.git
cd GoMeter
make build
# Binary output in bin/gometer
```

---

### 2. Basic Usage

#### Initialize a Starter Test Plan
```bash
./bin/gometer init my-test.gometer.yaml
```

#### Validate Syntax & Schema
```bash
./bin/gometer validate my-test.gometer.yaml
```

#### Execute Load Test
```bash
# Standard console summary
./bin/gometer run my-test.gometer.yaml

# Generate standalone interactive HTML report
./bin/gometer run my-test.gometer.yaml --output html --report-dir ./reports

# Output JSON report (ideal for CI/CD pipelines)
./bin/gometer run my-test.gometer.yaml --output json

# Real-time verbose streaming
./bin/gometer run my-test.gometer.yaml --verbose
```

---

### 3. Converting Existing Tests

```bash
# Convert a cURL command into a GoMeter YAML plan
./bin/gometer import --curl "curl -X POST https://api.example.com/items -H 'Content-Type: application/json' -d '{\"name\":\"test\"}'" -o imported.gometer.yaml

# Convert a Postman Collection (v2.1)
./bin/gometer import --postman my-collection.json -o postman.gometer.yaml
```

---

## 🤖 Model Context Protocol (MCP) Server

GoMeter includes a built-in MCP server adhering to the official specification, allowing AI assistants like **Claude Desktop**, **Cursor**, or **VS Code Copilot** to autonomously create, validate, execute, and analyze load tests.

### Running the MCP Server

```bash
# Standard I/O transport (Default, for Claude Desktop & Cursor)
./bin/gometer mcp

# Streamable HTTP transport
./bin/gometer mcp --transport http --port 8080
```

### Claude Desktop Configuration (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "gometer": {
      "command": "/usr/local/bin/gometer",
      "args": ["mcp"]
    }
  }
}
```

### Supported MCP Capabilities

- **Tools**:
  - `run_test`: Run any YAML test plan and retrieve aggregated latency metrics and SLA reports.
  - `validate_test`: Check syntax, schema, and referenced data files.
  - `create_test`: Programmatically generate GoMeter test plans with best-practice thresholds.
  - `analyze_results`: Ingest reports to identify latency bottlenecks and diagnose SLA violations.
  - `list_tests`: Discover all `*.gometer.yaml` test files across the workspace.
- **Resources**:
  - `gometer://docs/spec`: Complete schema reference specification.
  - `gometer://reports/latest`: The latest test run metrics and request samples.
- **Prompts**:
  - `generate_load_test`: Prompt template for creating complex load testing journeys.
  - `diagnose_bottleneck`: Structured diagnostic prompt for latency and throughput degradation.

---

## 🧩 VS Code Extension (VSIX)

The official GoMeter extension packages the entire testing workflow directly inside VS Code:

- **100% Self-Contained**: Bundles native Linux and Windows binaries inside the `.vsix` file. Zero external runtime setup required.
- **Interactive Webview Dashboard**: Real-time throughput (RPS), line chart latency timeline, and endpoint performance breakdowns.
- **Request & Response Inspector**: Click any row in the live execution stream to inspect method, URL, headers, JSON body, and assertion evaluation details.
- **Stop Control (`⏹ Stop Test`)**: Halt tests on demand without dropping metrics.
- **AI Integration (`vscode.lm`)**: Generate tests and diagnose bottlenecks using GitHub Copilot or configured models directly inside the editor.
- **Editor CodeLenses & Schema**: Live "Run Test", "Validate", and "Open Dashboard" buttons directly above test definitions with full YAML autocomplete.

### Install the Extension

```bash
code --install-extension release/v1.1.0/gometer-1.1.0.vsix
```

---

## 📝 Declarative YAML Test Plan Specification

A sample realistic test plan targeting public endpoints ([`examples/real-dummy-apis.gometer.yaml`](examples/real-dummy-apis.gometer.yaml)):

```yaml
name: "E-Commerce User Journey"
description: "Realistic multi-step scenario with token extraction and assertions"
version: "1.1.0"
base_url: "https://jsonplaceholder.typicode.com"

variables:
  sample_title: "GoMeter Benchmark Post"
  sample_body: "High-performance API testing with Go and MCP"

scenarios:
  - name: "Browse & Create Posts"
    virtual_users: 5
    duration: "10s"
    ramp_up: "2s"
    think_time: "50ms"
    requests:
      - name: "Get All Posts"
        method: "GET"
        path: "/posts"
        headers:
          Accept: "application/json"
        assertions:
          - type: "status"
            expected: "200"
          - type: "latency"
            expected: "500ms"
        extract:
          - name: "first_id"
            from: "body"
            query: "$[0].id"

      - name: "Create New Post"
        method: "POST"
        path: "/posts"
        headers:
          Content-Type: "application/json"
        body: |
          {
            "title": "${var:sample_title}",
            "body": "${var:sample_body}",
            "userId": 42
          }
        assertions:
          - type: "status"
            expected: "201"
          - type: "jsonpath"
            path: "$.id"
            expected: "101"

thresholds:
  - metric: "error_rate"
    operator: "<"
    value: 1.0
    unit: "%"
  - metric: "p95_latency"
    operator: "<"
    value: 500.0
    unit: "ms"
```

---

## 📊 Benchmarks & Verification

### 1. High-Concurrency Stress Benchmark (Local HTTP/2 Server)
- **Virtual Users**: 50 concurrent VUs
- **Duration**: 5.0 seconds
- **Total Requests Handled**: **18,760 requests**
- **Sustained Throughput**: **3,752.63 requests/second**
- **Success Rate**: **100.00%** (0 errors)
- **p50 (Median) Latency**: 92 µs
- **p95 Latency**: 5.97 ms

### 2. Live Public APIs Concurrency Validation
- **Target Services**: JSONPlaceholder, DummyJSON, HttpBin
- **Virtual Users**: 12 concurrent VUs across 3 distinct scenarios
- **Total Requests**: 183 live requests
- **Success Rate**: **100.00%**
- **p95 Latency**: 347.64 ms
- **SLA Thresholds**: All passed (`error_rate < 5%`, `p95 < 3000ms`)

---

## 📦 Releases & Versioning

GoMeter follows [Semantic Versioning (SemVer 2.0.0)](https://semver.org/). All components (Go CLI, MCP Server, and VS Code Extension) share identical synchronized version tags.

Past release archives and checksums are cataloged in [`release/index.json`](release/index.json):

- [`release/v1.1.0/`](release/v1.1.0/) — Stop Test control, Request/Response Inspector UX, pie chart removal, plan-level thresholds.
- [`release/v1.0.0/`](release/v1.0.0/) — Initial baseline release with MCP server and self-contained VSIX.

Refer to [`VERSIONING.md`](VERSIONING.md) for pre-release checklists and release discipline.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Ensure all unit tests pass: `make test`.
2. Format Go code using `gofmt -s -w .`.
3. If introducing features, update versioning per `VERSIONING.md`.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
