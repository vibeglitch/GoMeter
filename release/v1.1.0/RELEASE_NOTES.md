# GoMeter Release v1.1.0 (2026-11-07)

GoMeter v1.1.0 is a feature release that introduces real-time request inspection UX, test cancellation controls, responsive layout improvements, and comprehensive public dummy API validations.

## 🚀 What's New in v1.1.0

### 1. Test Stop & Cancellation Control
- Added interactive **`⏹ Stop Test`** button in the VS Code dashboard header.
- Added command `gometer.stopActiveTest` for keyboard shortcut and command palette execution.
- Implemented graceful cancellation in the Go runner: catches `SIGTERM` / `SIGINT` to safely drain active workers without discarding in-flight metrics or failing to produce reports.
- Webview status badge updates to `STOPPED` with amber indicator.

### 2. Request & Response Inspector UX
- **Live Stream Sample Capture**: Ingests up to 100 request samples during execution, prioritizing error samples.
- **Interactive Inspector Drawer / Modal**: Click any request row in the webview dashboard or standalone HTML report to inspect:
  - **Request Tab**: HTTP method, target URL, formatted request headers, and request body.
  - **Response Tab**: Status code, latency (ms), response headers, and syntax-highlighted JSON response body.
  - **Assertions Tab**: Validation breakdown (`✓ PASS` / `✗ FAIL`) with expected vs. actual values and failure explanations.

### 3. Responsive Dashboard Layout & Pie Chart Removal
- Removed the response distribution doughnut / pie chart from both the VS Code extension webview and HTML report templates.
- Replaced with a full-width real-time latency timeline chart (ms) and percentile distribution bar chart (`min`, `avg`, `p50`, `p90`, `p95`, `p99`, `max`).

### 4. Plan-Level and Scenario-Level SLA Thresholds
- Support defining `thresholds:` at both the top-level test plan and inside individual scenarios.
- Plan-level thresholds evaluate overall metrics (error rate, p95 latency, RPS, average latency) across all scenarios combined.

### 5. Flexible YAML Parameterization & Expression Aliases
- Added support for both `${var:NAME}` and `${NAME}` parameterization syntax in request bodies, URLs, and headers.
- Added support for `type: "jsonpath"` and `type: "body_json"` assertion aliases with both `query:` and `path:` fields.
- Added support for flat key-value pairs and structured `inline:` / `csv:` under `variables:`.

### 6. Real Public Dummy APIs Concurrency Test Suite
- Added `examples/real-dummy-apis.gometer.yaml` testing live endpoints:
  - JSONPlaceholder (`GET /posts`, `GET /posts/1`, `POST /posts` with variable substitutions)
  - DummyJSON (`GET /products?limit=5`)
  - HttpBin (`GET /get?source=gometer&test=live`)
- Verified 100% success rate across 183 live requests.

---

## 📦 Packages & Checksums
- `gometer-1.1.0.vsix` — Self-contained VS Code extension with bundled Linux and Windows binaries
- `gometer-v1.1.0-linux-amd64.tar.gz` — Static Linux amd64 binary
- `gometer-v1.1.0-windows-amd64.zip` — Windows amd64 binary (`gometer.exe`)
- `gometer-v1.1.0-darwin-amd64.tar.gz` — macOS Intel binary
- `gometer-v1.1.0-darwin-arm64.tar.gz` — macOS Apple Silicon binary
