# GoMeter Release v1.5.0

**Release Date:** 2026-11-08  
**Adherence:** Semantic Versioning (SemVer 2.0.0)

---

## Highlights

### 1. Original Retina Icon
- Added a brand-new, original, copyright-free icon in both retina PNG (`vscode-extension/resources/icon.png`, 512x512) and vector SVG (`vscode-extension/resources/icon.svg`).
- Features a dark graphite squircle, vibrant multi-hue speedometer gauge arc (`#10B981` -> `#06B6D4` -> `#38BDF8` -> `#3B82F6` -> `#8B5CF6` -> `#EC4899`), precision needle, glowing center hub, and "G" monogram accent.
- Configured across VS Code Activity Bar, Marketplace listing, and package manifests.

### 2. Export as CSV directly from Test Plans UI
- **Individual Test Plan CSV Export**:
  - Export button available in tree item inline action (`$(export)`), right-click context menu, and active editor tab title bar.
  - Generates comprehensive RFC 4180 CSV with Plan metadata, Scenarios, Virtual Users, Durations, Request Methods, Endpoints, Full URLs, Headers, Assertions, Extractors, Thresholds, Variables, and Latest Test Execution Metrics (Status, Total Reqs, Success Rate, RPS, Min/Avg/Max/P90/P95/P99 latencies).
  - Enriches rows with endpoint-level statistics when latest run reports are detected.
- **Folder-Level Test Plan CSV Export**:
  - Export button available in folder tree item inline action (`$(export)`), folder right-click context menu, and the Test Plans view title header bar (`navigation@4`).
  - Recursively discovers all GoMeter test plan files in the folder and subfolders and aggregates all endpoints and scenarios into a unified, structured CSV export.
  - Interactive save dialog with pre-filled default filename and one-click `Open CSV` prompt.

---

## Artifacts & Checksums

| File | SHA-256 Checksum |
|---|---|
| `gometer-1.5.0.vsix` | `f8db3c58f00761b389142bfb87dfaff7fe31ee9f912e6c574920fe8f543bf1b9` |
| `gometer-v1.5.0-linux-amd64.tar.gz` | `0a2fa56b31cd54bfd4de00c247688326046cbc3c83f6fd97790a1009bfb7e78b` |
| `gometer-v1.5.0-windows-amd64.zip` | `ee7e791bb7ff8aebabc641e5aad7ad14be2e93de22ee637d03e5a596b6239367` |
| `gometer-v1.5.0-darwin-arm64.tar.gz` | `7d576846c210ebb3bb1d2abd228f7076fbd87e8db8a68902e2affd1fbb6aa917` |
| `gometer-v1.5.0-darwin-amd64.tar.gz` | `7d0f1c306d4d0854a2e0d8d2830b3ec4ee7e3fbb8d4c1a874292523ffb59ec19` |
