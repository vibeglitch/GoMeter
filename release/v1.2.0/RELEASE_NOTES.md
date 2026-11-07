# GoMeter Release v1.2.0 (2026-11-07)

GoMeter v1.2.0 is a minor feature release introducing **Run History tracking & historical report exploration**, **Live Endpoint Aggregation & Metrics computation**, support and test suites for **all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)**, and **JWT Auth Token chaining**.

## 🚀 What's New in v1.2.0

### 1. Run History & Past Benchmarks Explorer
- **Automated Historical Archive**: Every test run is automatically persisted to `reports/history/run-<timestamp>.json` and indexed in `reports/history/index.json`.
- **Run Selector in Dashboard**: Interactive top-bar dropdown (`View Run:`) allowing instant switching between the live test run and past benchmarks.
- **Run History Table**: Displays past runs with timestamps, test names, total requests, throughput (RPS), p95 latency, error rates, SLA status (`PASS` / `FAIL`), and a one-click `Load 📊` button.
- **CLI History Subcommand**: Run `gometer history` from the terminal to view a formatted summary table of all recorded benchmark runs.

### 2. Live Aggregation & Real-Time Metrics Fix
- **Live Metric Calculation**: The dashboard now calculates real-time Throughput (RPS), Success Rate, Average Latency, and p95 Latency dynamically as request events stream in. Metrics never remain zero or blank.
- **Live Endpoint Aggregation Summary**: Endpoint stats (Method badge, Count, Success Rate %, Avg Latency, p95 Latency) populate and update live row-by-row during execution.
- **Robust Multi-Unit Latency Formatting**: Handles nanoseconds (from Go engine), microseconds, milliseconds, and formatted string durations gracefully.
- **Auto-Refresh & Synchronization**: Completed runs trigger automatic history synchronization across the extension and dashboard.

### 3. Full HTTP Methods & JWT Token Chaining Suite
- Verified all major HTTP verbs in real load-testing scenarios: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
- **Real Auth Token Chaining**:
  - `POST https://dummyjson.com/auth/login` extracts JWT token via JSONPath `token`.
  - Sets `Authorization: Bearer ${authToken}` on subsequent protected request `GET https://dummyjson.com/auth/me`.
- **Full CRUD Lifecycle**: Add product (`POST`), fetch product (`GET`), update title (`PUT`), mutate partial state (`PATCH`), and soft-delete (`DELETE`).
- **Negative & Protocol Assertions**: Status 401 unauthorized assertions, 404 not found assertions, and HTTP protocol validations (`HEAD`, `OPTIONS` on `httpbin.org`).
- Added runnable sample: `examples/comprehensive-http-methods-auth.gometer.yaml`.

---

## 📦 Packages & Checksums

| Package | SHA256 Checksum |
|---|---|
| `gometer-1.2.0.vsix` | `9c35bf34cfd0021b15c355892fbdb0c4c794feb043fe53c00ec59984db6227db` |
| `gometer-v1.2.0-linux-amd64.tar.gz` | `6d6de93d69d9b08b26aeaaeef188c7cf04c9e1300d3e7f677fc1890f5a116d57` |
| `gometer-v1.2.0-windows-amd64.zip` | `6fa606edcc7f929f3ec791f43abe2bbfcf2fa20d89023347781763d6a9d3f148` |
| `gometer-v1.2.0-darwin-arm64.tar.gz` | `b13b76a394eb098e6507724ee64c6045088a3ecc30b05ac0054ce59a47605a64` |
| `gometer-v1.2.0-darwin-amd64.tar.gz` | `87cc91e5f21d08328492088073a03642f83ab1cc07b289d2d70cd01e92189c54` |
