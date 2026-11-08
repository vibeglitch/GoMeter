# GoMeter v1.3.1 Release Notes

**Release Date:** 2026-11-08  
**Release Type:** Patch (SemVer 2.0.0)

GoMeter v1.3.1 provides resilient configuration resolution for nested folders and fixes the test execution stop lifecycle.

---

### 1. Resilient Multi-Tier CSV & File Resolution
- **Nested Folder Support**: Resolves relative CSV paths (`variables.csv[].file`) and request body files (`requests[].body_file`) even when test plans are dragged or moved into nested folders (e.g., `examples/data/`, `examples/testserver/`).
- **Multi-Tier Search Strategy**:
  1. Direct relative to test plan directory (`filepath.Join(baseDir, raw)`)
  2. Workspace CWD relative (`filepath.Clean(raw)`)
  3. Base filename in plan directory (`filepath.Join(baseDir, baseName)`)
  4. Relative to parent directory (`filepath.Join(parentDir, raw)`)
  5. Parent's `data/` directory (`filepath.Join(parentDir, "data", baseName)`)
  6. Grandparent fallbacks & workspace `examples/data` / `data/`
- Completely eliminates `failed to open CSV file: no such file or directory` errors caused by folder reorganization.

---

### 2. Live Demo Duration & Test Stop Lifecycle
- **Tuned Demo Durations**:
  - `demo.gometer.yaml` increased from 2s to 30s targeting public `https://jsonplaceholder.typicode.com`, ensuring users have ample time to watch real-time metrics streaming, review assertions, and interactively halt tests early.
  - `high-concurrency.gometer.yaml` tuned to 20s.
  - `csv-auth-flow.gometer.yaml` tuned to 25s.
- **Graceful Stop Lifecycle**:
  - `gometer.stopActiveTest` sends `SIGINT` first to trigger clean cancellation in the Go engine, with automatic fallback escalation to `SIGKILL` if unhandled.
  - The Go CLI detects `ctx.Err() != nil` upon user stop and avoids emitting false SLA breach failures when tests are intentionally cancelled early.
  - Immediate tactile UI response on the "⏹ Stop Test" button (`⏹ Stopping...` with instant click feedback).
  - Clear user notifications when stopping or if a test completed naturally.

---

### 3. Binary Artifacts & Verification
All precompiled binaries and the self-contained VSIX package are built with `CGO_ENABLED=0`:
- `gometer-1.3.1.vsix`
- `gometer-v1.3.1-linux-amd64.tar.gz`
- `gometer-v1.3.1-windows-amd64.zip`
- `gometer-v1.3.1-darwin-arm64.tar.gz`
- `gometer-v1.3.1-darwin-amd64.tar.gz`
