<div align="center">

# ⚡ Tensilix for Visual Studio Code

### High-Performance API Load Tester, Stress Testing Engine & Real-Time Telemetry

*The zero-dependency, Go-powered modern load tester and API performance suite directly inside your editor.*

[![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Version](https://img.shields.io/badge/Version-1.6.2-blue?style=for-the-badge)](VERSIONING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Official%20Go%20SDK-purple?style=for-the-badge)](https://modelcontextprotocol.io)
[![Cross-Platform](https://img.shields.io/badge/Platform-Linux%20|%20macOS%20|%20Windows-brightgreen?style=for-the-badge)](https://github.com/vibeglitch/Tensilix)

</div>

---

## 📌 What is Tensilix?

In materials science and structural engineering, a **tensile test** subjects a structure to controlled tension until its ultimate breaking point to determine its resilience under maximum stress. 

**Tensilix** brings that exact philosophy to software engineering and microservices. It is a modern, ultra-lightweight, and lightning-fast API load tester that simulates heavy concurrent user traffic to discover breaking points, latency degradation, and concurrency race conditions before they reach production.

Unlike legacy tools like Apache JMeter (which requires heavy JVM installations and megabytes of XML) or Postman (which struggles under high virtual user counts), **Tensilix is 100% self-contained**:
- **Zero Runtime Dependencies**: No Java, JVM, Python, or Node.js required to execute load tests.
- **Pre-Bundled Universal Binaries**: Ships with native 64-bit binaries for **Linux (amd64)**, **macOS Apple Silicon (arm64)**, **macOS Intel (amd64)**, and **Windows (amd64)**.
- **Ultra-Low Memory Footprint**: Powered by native Go goroutines, consuming up to **50x less memory** than JVM-based runners when simulating thousands of virtual users.
- **100% Local & Offline**: Your API keys, payloads, and telemetry never leave your machine.

---

## ⚡ Core Features & Capabilities

### 1. 📊 Interactive Live Webview Dashboard
- **Dynamic Real-Time Charts**: Canvas-accelerated line charts displaying live requests-per-second (RPS) and latency distributions updated every second.
- **Deep Latency Percentiles**: Instant visibility into `min`, `avg`, `max`, `p50`, `p90`, `p95`, and `p99` response times.
- **Status Code Distribution**: Visual color-coded breakdown of HTTP responses (2xx Success, 3xx Redirect, 4xx Client Error, 5xx Server Error).
- **Virtual User Gauges**: Live tracking of active virtual users (VUs) and completion percentages.

### 2. 🔍 Deep Request & Response Inspector
- Click on any executed request in the live log to open the **Inspector Panel**.
- Inspect exact outgoing HTTP request headers, query parameters, and request body.
- View incoming response status, HTTP response headers, and syntax-highlighted JSON/XML response bodies.
- Verify assertion pass/fail results for each individual request step.

### 3. 📁 Test Plans Sidebar & Folder Hierarchy
- **Organized Test Suites**: Group your test plans into logical workspace folders (e.g., `smoke/`, `load/`, `auth/`, `stress/`).
- **Sidebar Actions**: Create new folders, initialize starter test plans, run tests with one click, or export reports directly from the explorer.
- **Rich File & Folder Hover Tooltips**:
  - **Test Plan Hover**: Displays the latest run outcome (`🟢 PASSED` or `🔴 FAILED`), timestamp, run duration, virtual users, total requests, RPS, error rate, and P95 latency.
  - **Folder Hover**: Displays overall suite health (e.g., `Passed: 4/5 plans`), combined requests, combined throughput, worst P95 latency, and a breakdown of individual plan results.

### 4. 💾 Flexible Exporting & Reporting
- **One-Click CSV Export**: Export individual test execution summaries or complete folder suites directly to `.csv` spreadsheets for stakeholders or regression tracking.
- **Automated JSON Reports**: Full structured JSON reports saved automatically to your configured report directory (`./reports`), ready for CI/CD ingestion.

### 5. ⏹ Graceful Test Cancellation
- Stop running tests at any point using the Webview **⏹ Stop Test** button or via the Command Palette.
- Active worker goroutines cleanly drain in-flight connections without crashing, and all metrics gathered up to the point of cancellation are preserved in the final report.

### 6. 🤖 Autonomous AI Coding Agent & MCP Server Integration
- **Model Context Protocol (MCP)**: Bundles an official MCP server enabling AI agents (in Claude Code, Cursor, Antigravity, and Gemini) to autonomously discover, run, sequence, and validate API test suites.
- **Built-In Agent Skill (`tensilix-test-architect`)**: Automatically installed to `.agents/skills/` and global assistant directories to teach your AI assistant the exact grammar, assertions, and token chaining rules for Tensilix test plans.
- **AI Test Generation**: Generate complete, production-ready `.tensilix.yaml` test suites from natural language prompts (e.g., *"Test our checkout flow with 50 concurrent users and verify JWT auth"*).
- **AI Diagnostic Analysis**: Ask your AI assistant to diagnose test results and pinpoint whether slow P95 times are caused by database bottlenecks, connection pool starvation, or unindexed queries.

### 7. 📄 Full Schema Autocomplete & CodeLenses
- Full IntelliSense autocomplete, hover documentation, and syntax diagnostics for `*.tensilix.yaml`, `*.tensilix.yml`, `*.gometer.yaml`, and `*.gometer.yml`.
- CodeLenses appear directly in your YAML editor above scenario definitions:
  - `$(play) Run Tensilix Test`
  - `$(check) Validate Plan`
  - `$(graph-line) Open Dashboard`

---

## 🛠 Test Plan Syntax & Anatomy (`.tensilix.yaml`)

Tensilix uses clean, declarative YAML. Both `.tensilix.yaml` and `.gometer.yaml` extensions are natively supported.

### Example 1: High-Concurrency Endpoint Benchmark
```yaml
name: "User Service Benchmark"
description: "Sustained high-throughput benchmark for user profile lookups"
version: "1.0.0"
base_url: "https://api.example.com"

defaults:
  headers:
    Accept: "application/json"
    User-Agent: "Tensilix-Engine/1.6.2"
  timeout: 5s

scenarios:
  - name: "Profile Read Spike"
    virtual_users: 100
    duration: 30s
    ramp_up: 5s
    think_time: 50ms
    requests:
      - name: "Fetch User Profile"
        method: "GET"
        path: "/api/v1/users/42"
        assertions:
          - type: "status_code"
            operator: "equals"
            expected: 200
          - type: "latency"
            operator: "less_than"
            expected: 150ms

thresholds:
  - metric: "p95_latency"
    operator: "less_than"
    expected: 200ms
  - metric: "error_rate"
    operator: "less_than"
    expected: 0.01 # < 1% errors
```

---

### Example 2: Multi-Step Chained User Journey (JWT Authentication)
Extract tokens or response attributes dynamically with `extract` and chain them into subsequent requests using `${variable_name}`:

```yaml
name: "Authenticated Checkout Flow"
description: "Login, extract Bearer token, fetch cart, and place order"
version: "1.0.0"
base_url: "https://shop.example.com"

defaults:
  headers:
    Content-Type: "application/json"
    Accept: "application/json"

scenarios:
  - name: "Customer Checkout Journey"
    virtual_users: 25
    duration: 60s
    ramp_up: 10s
    think_time: 200ms
    requests:
      # Step 1: Authenticate and extract token
      - name: "User Login"
        method: "POST"
        path: "/api/v1/auth/login"
        body: |
          {
            "username": "customer_${__vu}",
            "password": "Password123!"
          }
        extract:
          jwt_token: "$.data.access_token"
          user_id: "$.data.user.id"
        assertions:
          - type: "status_code"
            operator: "equals"
            expected: 200

      # Step 2: Use extracted token in Authorization header
      - name: "Retrieve Cart"
        method: "GET"
        path: "/api/v1/users/${user_id}/cart"
        headers:
          Authorization: "Bearer ${jwt_token}"
        extract:
          cart_id: "$.cart.id"
        assertions:
          - type: "status_code"
            operator: "equals"
            expected: 200

      # Step 3: Complete order using extracted cart ID
      - name: "Submit Order"
        method: "POST"
        path: "/api/v1/orders"
        headers:
          Authorization: "Bearer ${jwt_token}"
        body: |
          {
            "cart_id": "${cart_id}",
            "payment_method": "credit_card"
          }
        assertions:
          - type: "status_code"
            operator: "equals"
            expected: 201
          - type: "json_path"
            path: "$.status"
            operator: "equals"
            expected: "CONFIRMED"
```

---

## 🚀 Quickstart Guide (3 Minutes)

1. **Open your project** in VS Code.
2. In the Activity Bar, click the **Tensilix icon (⚡)** to open the sidebar.
3. Click **Create Starter Test Plan (`🗎+`)** or use `Ctrl+Shift+P` -> `Tensilix: Create Starter Test Plan`.
4. Save the file as `my-test.tensilix.yaml`.
5. Click **`$(play) Run Tensilix Test`** above the scenario in the editor, or click the play button in the sidebar.
6. The **Tensilix Live Dashboard** will open automatically, displaying live RPS, latency percentiles, and incoming response telemetry!

---

## ⌨️ Command Palette Reference

All commands can be invoked from the VS Code Command Palette (`Ctrl+Shift+P` on Linux/Windows, `Cmd+Shift+P` on macOS):

| Command | Identifier | Description |
| :--- | :--- | :--- |
| **Tensilix: Run Current Test Plan** | `gometer.runActiveTest` | Runs the test plan in the currently open editor |
| **Tensilix: Open Live Dashboard** | `gometer.openDashboard` | Displays the interactive real-time telemetry panel |
| **Tensilix: Stop Running Test** | `gometer.stopActiveTest` | Gracefully cancels the active load test run |
| **Tensilix: Create Starter Test Plan** | `gometer.initTestPlan` | Creates a new starter `.tensilix.yaml` test plan |
| **Tensilix: Validate Test Plan** | `gometer.validateTestPlan` | Validates YAML syntax, schemas, and assertions |
| **Tensilix: Export Test Results as CSV** | `gometer.exportPlanAsCsv` | Exports test results for a plan as a CSV report |
| **Tensilix: Export Folder Results as CSV** | `gometer.exportFolderAsCsv` | Exports aggregated results for an entire folder suite |
| **Tensilix: Generate Test Plan with AI** | `gometer.generateTestWithAI` | Generates a complete test plan from natural language |
| **Tensilix: Analyze Test Results with AI** | `gometer.analyzeReportWithAI` | Produces an AI performance diagnosis from test data |
| **Tensilix: Install AI Coding Agent Skill** | `gometer.installAgentSkill` | Provisions the agent skill for Cursor, Claude, Antigravity |

---

## ⚙️ Configuration Settings

Customize Tensilix behavior in your VS Code `settings.json`:

```json
{
  // Custom path to tensilix/gometer binary (leave empty to use bundled universal binary)
  "tensilix.binaryPath": "",

  // Default output format for reports: "json", "html", "console", or "all"
  "tensilix.defaultOutputFormat": "json",

  // Directory where test execution reports are saved
  "tensilix.reportDirectory": "./reports"
}
```

---

## 📄 License & Attribution

Tensilix is open-source software licensed under the [MIT License](LICENSE).  
Maintained with ❤️ by [Naveen Kumar Polisetty / vibeglitch](https://github.com/vibeglitch/Tensilix).
