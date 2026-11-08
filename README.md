<div align="center">

# ⚡ GoMeter

**The Modern, High-Performance API Testing & Load Runner Alternative to Apache JMeter**

*Engineered in Go for extreme concurrency, native Model Context Protocol (MCP) integration, and a self-contained, cross-platform VS Code extension.*

[![CI](https://github.com/vibeglitch/GoMeter/actions/workflows/ci.yml/badge.svg)](https://github.com/vibeglitch/GoMeter/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Version](https://img.shields.io/badge/Version-1.6.2-blue?style=for-the-badge)](VERSIONING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Official%20Go%20SDK-purple?style=for-the-badge)](https://modelcontextprotocol.io)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-VSIX%20v1.6.2-007ACC?style=for-the-badge&logo=visual-studio-code)](release/v1.6.2/)

---

[Key Features](#-key-features) •
[Why GoMeter?](#-why-gometer-vs-jmeter) •
[Quickstart](#-quickstart) •
[VS Code Extension](#-vs-code-extension-vsix) •
[AI Coding Agent Skill](#-embedded-ai-coding-agent-skill) •
[MCP Server](#-model-context-protocol-mcp-server) •
[YAML Specification](#-declarative-yaml-test-plan-specification) •
[Releases](#-releases--download-matrix)

</div>

---

## 📖 Overview

**GoMeter** is a blazing-fast, lightweight API load testing and performance benchmarking platform written from scratch in Go. It replaces heavy Java Virtual Machine (JVM) footprints, fragile XML test plans (`.jmx`), and complex setup with:

1. **Clean Declarative YAML**: Human-readable, Git-friendly test plans with variables, environment substitutions, and resilient CSV parameterization.
2. **Goroutine-Powered Concurrency**: High-throughput virtual user simulation scaling to tens of thousands of concurrent requests with ultra-low memory overhead.
3. **100% Self-Contained VS Code Extension**: Bundled with native binaries for Linux, Windows, macOS Apple Silicon, and macOS Intel. Features a real-time Webview dashboard, request inspector, CSV export, and rich tooltips.
4. **Embedded AI Coding Agent Skill (`gometer-test-architect`)**: Automatically equips your IDE coding agents (Cursor, Claude Code, Gemini CLI, Antigravity) with deep knowledge to design, sequence, and chain dependent API tests.
5. **Native Model Context Protocol (MCP)**: Built with the official Go SDK for deep integration with AI coding assistants.

---

## ⚡ Key Features

- **🚀 Extreme Throughput & Ultra-Low Memory**: Thousands of virtual users simulated using lightweight Go goroutines (~4KB stack) and pooled keep-alive HTTP transports (<30MB baseline RAM).
- **📄 Declarative YAML Test Plans**: Simple, expressive YAML schemas with inline variables (`${var:KEY}`), environment variables (`${env:KEY}`), and dynamic extraction parameters (`${extract:TOKEN}`).
- **📁 Resilient CSV Data Parameterization**: Seamlessly cycle or randomize user datasets across virtual users. Supports resilient relative-path resolution from test plan folders.
- **🔗 Multi-Step Request Chaining & Auth Extraction**: Extract session IDs, Bearer JWT tokens, or headers from upstream requests and inject them into downstream steps.
- **📊 HDR Histogram Analytics**: Microsecond-precision metrics tracking (`min`, `avg`, `max`, `p50`, `p90`, `p95`, `p99`), real-time RPS, and error percentages.
- **📈 Real-Time Webview Dashboard**: Live line charts with dynamic time-scaling, status breakdowns, and comprehensive percentile telemetry.
- **🔍 Request & Response Inspector**: Live click-to-inspect viewer displaying full request headers, payload body, response headers, syntax-highlighted response body, and assertion outcomes.
- **🟢 Rich File & Folder Hover Tooltips**: Hover over any test plan or directory in the Test Plans sidebar to view instant health metrics, passed/failed counts, RPS, and worst-case latency percentiles.
- **💾 Export Test Results as CSV**: One-click CSV export for individual test runs or aggregate folder suites directly from the sidebar.
- **⏹ Graceful Test Cancellation**: Instantly stop active tests from the CLI (`Ctrl+C`) or Webview (`⏹ Stop Test`); active workers drain cleanly and all collected metrics are preserved in reports.
- **🤖 Built-In AI Coding Agent Skill (`gometer-test-architect`)**: Automatically installs to `.agents/skills/` and global configurations to guide AI assistants in generating valid, production-grade test suites.
- **🔌 Native MCP Server**: Exposes 5 tools, 2 resources, and 2 prompts for Claude Desktop, Cursor, and VS Code Copilot.
- **🌐 Universal Cross-Platform Extension**: Single VSIX package bundling native binaries for Linux `amd64`, Windows `amd64`, macOS `arm64` (Apple Silicon M1-M4), and macOS `amd64` (Intel).

---

## 🥊 Why GoMeter vs. JMeter?

| Feature | Apache JMeter | GoMeter ⚡ |
|:---|:---|:---|
| **Runtime Dependency** | Requires heavy Java Runtime (JRE / JDK 8+) | **Single static binary (zero runtime dependencies)** |
| **Concurrency Model** | 1 OS thread per VU (~1MB stack per thread) | **Lightweight Go Goroutines (~4KB stack per VU)** |
| **Test Plan Format** | Complex, verbose, merge-conflict-prone XML (`.jmx`) | **Clean, Git-friendly Declarative YAML** |
| **Startup Time** | 5 – 15 seconds (JVM warmup) | **< 15 milliseconds** |
| **Memory Footprint** | ~500MB – 2GB under moderate load | **< 30MB under thousands of VUs** |
| **IDE Integration** | Separate external Java Swing GUI | **Native VS Code Extension with Real-Time Dashboard** |
| **AI / Agent Support** | None (manual GUI clicks) | **Native MCP Server & Embedded AI Agent Skill** |
| **Data Format Importers** | Plugin installation required | **Built-in `curl`, `postman`, and `openapi` converters** |

---

## 🚀 Quickstart

### 1. Installation

#### Download Precompiled Release Binary
Download the prebuilt static binary for your operating system from the [`release/`](release/) catalog or [GitHub Releases](https://github.com/vibeglitch/GoMeter/releases):

```bash
# Linux amd64
tar -xzf gometer-v1.6.2-linux-amd64.tar.gz
sudo mv gometer /usr/local/bin/

# macOS Apple Silicon (M1/M2/M3/M4)
tar -xzf gometer-v1.6.2-darwin-arm64.tar.gz
sudo mv gometer /usr/local/bin/

# macOS Intel
tar -xzf gometer-v1.6.2-darwin-amd64.tar.gz
sudo mv gometer /usr/local/bin/
```

#### Build from Source
```bash
git clone https://github.com/vibeglitch/GoMeter.git
cd GoMeter
make build
# Binary output in bin/gometer
```

---

### 2. Basic CLI Commands

#### Initialize a Starter Test Plan
```bash
gometer init my-test.gometer.yaml
```

#### Validate Test Plan Syntax & Schema
```bash
gometer validate my-test.gometer.yaml
```

#### Execute Load Test
```bash
# Console summary with live progress
gometer run my-test.gometer.yaml

# Generate interactive standalone HTML report
gometer run my-test.gometer.yaml --output html --report-dir ./reports

# Output JSON report (ideal for CI/CD pipelines)
gometer run my-test.gometer.yaml --output json

# Real-time verbose request-by-request streaming
gometer run my-test.gometer.yaml --verbose
```

#### Import from Existing Tools
```bash
# Convert a cURL command into a GoMeter YAML plan
gometer import --curl "curl -X POST https://api.example.com/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\"}'" -o login.gometer.yaml

# Convert a Postman Collection (v2.1)
gometer import --postman collection.json -o postman-suite.gometer.yaml

# Convert an OpenAPI 3.0 / Swagger spec
gometer import --openapi petstore.yaml -o petstore.gometer.yaml
```

---

## 🧩 VS Code Extension (VSIX)

The official GoMeter extension packages the entire testing workflow directly inside Visual Studio Code:

- **Universal Cross-Platform**: Bundles native binaries for Linux, Windows, and macOS (ARM64 & Intel). Zero compilers or runtimes required.
- **Sidebar Test Plans Explorer**: Browse test plan hierarchies, initialize new folders, generate tests with AI, and view aggregate test metrics.
- **Rich Hover Tooltips**:
  - **Plan Hover**: Shows latest status (`🟢 PASSED` / `🔴 FAILED`), duration, VUs, total requests, RPS, error rate, and full latency percentiles (Min, Avg, Max, P90, P95, P99).
  - **Folder Hover**: Displays passed vs failed plan breakdown, combined requests, combined RPS, and worst-case latency.
- **Export Test Results as CSV**: Export comprehensive execution summaries, request telemetry, and SLA threshold evaluations to `.csv` files.
- **Live Real-Time Dashboard**:
  - Dynamic line chart showing request latency over the entire test duration.
  - Interactive Request/Response Inspector: Drill down into headers, payload, response bodies, and assertion statuses.
  - Test controls: Start, re-run, or gracefully stop active tests.
- **Editor CodeLenses & YAML Validation**: Instant "Run Test" and "Validate" actions directly above YAML files with schema validation and autocompletion.

### Install the Extension

Install the extension directly in VS Code:
```bash
code --install-extension release/v1.6.2/gometer-runner-1.6.2.vsix
```

---

## 🤖 Embedded AI Coding Agent Skill

GoMeter features a built-in AI Coding Agent Skill: **`gometer-test-architect`**.

When the VS Code extension activates, it automatically provisions the skill to your project workspace and global coding agent directories:
- Workspace: `.agents/skills/gometer-test-architect/`
- Global Antigravity / Gemini: `~/.gemini/config/skills/gometer-test-architect/`
- Global Claude Code: `~/.claude/skills/gometer-test-architect/`

### What the Agent Skill Does:
- **Teaches AI Assistants**: Enables coding agents in Cursor, Claude Code, and Antigravity to understand GoMeter schemas without prompting.
- **Multi-Step Test Sequencing**: Teaches agents how to design realistic user journeys (e.g., login ➔ extract JWT ➔ pass Bearer token to authenticated endpoints ➔ assert results).
- **Dynamic Parameterization**: Demonstrates how to configure CSV datasets, variable substitutions, and SLA thresholds.

---

## 🔌 Model Context Protocol (MCP) Server

GoMeter includes a built-in MCP server adhering to the official specification, allowing AI assistants like **Claude Desktop**, **Cursor**, or **VS Code Copilot** to autonomously create, validate, execute, and analyze load tests.

### Running the MCP Server
```bash
# Standard I/O transport (Default, for Claude Desktop & Cursor)
gometer mcp

# Streamable HTTP transport
gometer mcp --transport http --port 8080
```

### Claude Desktop Configuration (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "gometer": {
      "command": "gometer",
      "args": ["mcp"]
    }
  }
}
```

### Supported MCP Capabilities:
- **Tools**: `run_test`, `validate_test`, `create_test`, `analyze_results`, `list_tests`.
- **Resources**: `gometer://docs/spec`, `gometer://reports/latest`.
- **Prompts**: `generate_load_test`, `diagnose_bottleneck`.

---

## 📝 Declarative YAML Test Plan Specification

A sample multi-step test plan demonstrating token extraction, variable substitution, assertions, and SLA thresholds:

```yaml
name: "Authentication & Data Flow Suite"
description: "Realistic user login, token extraction, and authorized endpoint execution"
version: "1.6.2"
base_url: "https://api.example.com"

variables:
  client_id: "web-client-prod"

scenarios:
  - name: "Authenticated User Journey"
    virtual_users: 25
    duration: "30s"
    ramp_up: "5s"
    think_time: "100ms"
    data:
      source: "data/users.csv"
      order: "sequential"
    requests:
      - name: "User Login"
        method: "POST"
        path: "/api/v1/auth/login"
        headers:
          Content-Type: "application/json"
          X-Client-ID: "${var:client_id}"
        body: |
          {
            "username": "${data:username}",
            "password": "${data:password}"
          }
        assertions:
          - type: "status"
            expected: "200"
          - type: "latency"
            expected: "500ms"
        extract:
          - name: "auth_token"
            from: "body"
            query: "$.token"

      - name: "Get Account Profile"
        method: "GET"
        path: "/api/v1/user/profile"
        headers:
          Authorization: "Bearer ${extract:auth_token}"
          Accept: "application/json"
        assertions:
          - type: "status"
            expected: "200"
          - type: "jsonpath"
            path: "$.status"
            expected: "active"

thresholds:
  - metric: "error_rate"
    operator: "<"
    value: 1.0
    unit: "%"
  - metric: "p95"
    operator: "<"
    value: 400
    unit: "ms"
```

---

## 📦 Releases & Download Matrix

| Platform | Architecture | Package Format | Download |
|:---|:---|:---|:---|
| **VS Code Extension** | **Universal (All OS)** | `.vsix` | [`gometer-runner-1.6.2.vsix`](release/v1.6.2/gometer-runner-1.6.2.vsix) |
| **Linux** | `amd64` (x86_64) | `.tar.gz` | [`gometer-v1.6.2-linux-amd64.tar.gz`](release/v1.6.2/gometer-v1.6.2-linux-amd64.tar.gz) |
| **Windows** | `amd64` (x64) | `.zip` | [`gometer-v1.6.2-windows-amd64.zip`](release/v1.6.2/gometer-v1.6.2-windows-amd64.zip) |
| **macOS Apple Silicon** | `arm64` (M1/M2/M3/M4) | `.tar.gz` | [`gometer-v1.6.2-darwin-arm64.tar.gz`](release/v1.6.2/gometer-v1.6.2-darwin-arm64.tar.gz) |
| **macOS Intel** | `amd64` (x86_64) | `.tar.gz` | [`gometer-v1.6.2-darwin-amd64.tar.gz`](release/v1.6.2/gometer-v1.6.2-darwin-amd64.tar.gz) |

*Full release notes and SHA256 checksums are documented in [`release/v1.6.2/RELEASE_NOTES.md`](release/v1.6.2/RELEASE_NOTES.md).*

---

## 🛡️ Repository Security & Governance

- **Branch Protection**: The `main` branch is protected by active GitHub rulesets. Direct pushes are disabled, CI checks are mandatory, and all merges must be reviewed and accepted by `@vibeglitch`.
- **Code Ownership**: Configured via [`.github/CODEOWNERS`](.github/CODEOWNERS).
- **Reporting Vulnerabilities**: See [`SECURITY.md`](SECURITY.md).
- **Contributing**: See [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 📄 License

GoMeter is released under the **[MIT License](LICENSE)**.
