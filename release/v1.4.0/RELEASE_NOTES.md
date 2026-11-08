# GoMeter v1.4.0 Release Notes

**Release Date:** 2026-11-08  
**Release Type:** Minor (SemVer 2.0.0)

GoMeter v1.4.0 brings a streamlined dashboard, comprehensive performance metrics, and a full-spectrum request latency timeline graph.

---

### 1. Streamlined Dashboard UI
- **Removed AI Analysis Button**: Removed the "✨ Analyze with AI" button from the dashboard action bar per user request, leaving an unobstructed action bar dedicated to live test execution control (`⏹ Stop Test` and `▶ Run Again`).

---

### 2. Comprehensive Performance Metrics
- **Extended Metric Cards Grid**: Expanded from 5 cards to a 10-card high-density responsive grid:
  1. **Total Requests**: Real-time request counter.
  2. **Throughput (RPS)**: Live requests per second.
  3. **Success Rate**: Live pass rate percentage.
  4. **Time Taken (Duration)**: Active execution timer formatted as `Xs` or `Xms`.
  5. **Min Latency**: Lowest response latency observed.
  6. **Avg Latency**: Arithmetic mean latency across all requests.
  7. **Max Latency**: Peak spike latency.
  8. **p90 Latency**: 90th percentile latency.
  9. **p95 Latency**: 95th percentile latency.
  10. **p99 Latency**: 99th percentile tail latency.
- **Enhanced Endpoint Breakdown Table**: Added Min, Avg, Max, p90, p95, and p99 columns for every individual endpoint, both during live execution and when inspecting final/historical reports.

---

### 3. Dynamic Full-Spectrum Latency Timeline Graph
- **No Window / Point Discarding**: Completely removed the legacy 40-point limit window. Every single request executed during the test is preserved in the timeline.
- **Dynamic Horizontal Scaling**: As test execution progresses (from 10 to 1,000 to 10,000+ requests), the graph dynamically compresses and scales horizontally to fit all results across the canvas.
- **Adaptive Visual Density**:
  - `N <= 60`: Emphasized 2.5px circular nodes.
  - `60 < N <= 200`: Fine 1.2px micro nodes.
  - `N > 200`: Clean, anti-aliased 1.0px vector timeline stroke for buttery-smooth 60fps rendering without visual dot blobbing.
- **Interactive Mouse Scrubbing**: Hovering over the graph allows scrubbing through any point along the timeline to inspect exact request numbers and latencies (e.g. `Req #42: 125.4ms (500 total)`).
- **Clear X-Axis Guides**: Start (`#1`), midpoint (`#N/2`), and final (`#N`) request count labels.

---

### 4. Self-Contained Artifacts
All precompiled binaries and the VSIX extension are packaged self-contained with `CGO_ENABLED=0`:
- `gometer-1.4.0.vsix`
- `gometer-v1.4.0-linux-amd64.tar.gz`
- `gometer-v1.4.0-windows-amd64.zip`
- `gometer-v1.4.0-darwin-arm64.tar.gz`
- `gometer-v1.4.0-darwin-amd64.tar.gz`
