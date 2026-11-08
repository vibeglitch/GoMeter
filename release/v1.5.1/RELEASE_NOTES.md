# GoMeter Release v1.5.1

**Release Date:** 2026-11-08  
**Adherence:** Semantic Versioning (SemVer 2.0.0)

---

## Highlights

### 1. Publisher ID Marketplace Alignment
- Fixed VS Code Marketplace publisher ID from `naveen` to official marketplace publisher `NaveenKumarPolisetty`.
- Resolves the extension publishing upload error: `Publisher ID 'naveen' provided in the extension manifest should match the publisher ID 'NaveenKumarPolisetty'`.

### 2. Rich Test Results Hover Tooltips on Files & Folders
- **Folder Test Results on Hover**:
  - Hovering over any folder in the Test Plans tree now renders a rich Markdown card with aggregate execution statistics:
    - **Overall Status**: Count of passed vs failed test plans (e.g. `🟢 2 Passed, 🔴 1 Failed`)
    - **Total Requests**: Sum of requests across all executed plans in that folder
    - **Combined Throughput**: Aggregated requests per second (RPS)
    - **Worst P95 Latency**: Highest P95 latency among executed plans
    - **Plan Breakdown**: List of individual test plans with pass/fail badges, request counts, and RPS
  - Dynamic folder tree description: `${passedCount}/${executedCount} passed (${totalPlans} plans)`
- **File Test Results on Hover**:
  - Hovering over any individual `.yaml`/`.yml` test plan renders the latest execution results card:
    - **Status**: `🟢 PASSED` or `🔴 FAILED` with last execution timestamp
    - **Duration & Virtual Users**: Test run length and virtual user concurrency
    - **Throughput & Requests**: Total requests and RPS
    - **Latency Breakdown**: Min, Avg, Max, P90, P95, and P99 latencies
  - Dynamic file tree description: `🟢 ${rps} RPS • ${p95}ms` or `🔴 ${errRate} err • ${rps} RPS`

### 3. Export Test Results as CSV
- Instead of exporting test plan definitions, the CSV export focuses on **Test Results**:
  - Exports execution records: Run ID, Test Name, Plan File, Folder, Timestamp, Status, Duration, Total Reqs, Success/Failed Reqs, Error Rate, RPS, Min/Avg/Max/P50/P90/P95/P99 latencies, Scenario Name, Endpoint Name, HTTP Method, Endpoint URL, Endpoint Reqs, Endpoint Success/Failed, Endpoint Latencies, and SLA Breaches.
  - Interactive "Run Test Now" prompt if a test plan hasn't been executed yet.
  - Folder-level export gathers and aggregates all test execution results across the entire directory into `${folderName}-test-results.csv`.

---

## Artifacts & Checksums

| File | SHA-256 Checksum |
|---|---|
| `gometer-1.5.1.vsix` | `5724070e19db1a5c78bbc92d26e708221cec364f98e2f195fe92bf3c0c536cc3` |
| `gometer-v1.5.1-linux-amd64.tar.gz` | `4bd0d81b8cd0466b448e5da63bfdf3c12e9bb036acc97209be6c9c53e8bfb5fa` |
| `gometer-v1.5.1-windows-amd64.zip` | `edfba1098522c9ff5bbc4cb0ee02379b6bf8a28db6c7e482eef1b377e75a2c0c` |
| `gometer-v1.5.1-darwin-arm64.tar.gz` | `6c49bace3508553bf39cfbadbe203301affa01a97d2f0118d97e1ecd73f90094` |
| `gometer-v1.5.1-darwin-amd64.tar.gz` | `d8ca3906b9311934b1e9351c99beaf44310adfb49de6b119ebda91407d2b72e8` |
