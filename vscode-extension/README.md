<div align="center">

# ⚡ GoMeter for Visual Studio Code

**High-Performance API Testing & Load Runner**

*The Go-powered modern alternative to Apache JMeter directly inside VS Code.*

[![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Version](https://img.shields.io/badge/Version-1.6.2-blue?style=for-the-badge)](VERSIONING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Official%20Go%20SDK-purple?style=for-the-badge)](https://modelcontextprotocol.io)

</div>

---

## 🚀 Overview

**GoMeter for VS Code** provides a complete, 100% self-contained API testing and load simulation environment inside your editor. Bundling static native Go binaries for **Linux (amd64)**, **Windows (amd64)**, and **macOS (Apple Silicon & Intel)**, it requires zero external runtimes, JVM installations, or Node.js dependencies.

---

## ⚡ Key Features

- **📊 Real-Time Webview Dashboard**: Live line charts with dynamic time-scaling, status breakdowns, and comprehensive percentile telemetry (`min`, `avg`, `max`, `p50`, `p90`, `p95`, `p99`).
- **🔍 Request & Response Inspector**: Live click-to-inspect viewer displaying full request headers, payload body, response headers, syntax-highlighted response body, and assertion outcomes.
- **📁 Sidebar Test Plans Explorer**: Browse test plan folders, initialize new plans, create folders, and run tests directly from the sidebar.
- **🟢 Rich File & Folder Hover Tooltips**:
  - **Plan Hover**: Shows latest status (`🟢 PASSED` / `🔴 FAILED`), timestamp, duration, VUs, total requests, RPS, error rate, and full latency percentiles.
  - **Folder Hover**: Displays passed vs failed plan breakdown, combined requests, combined RPS, worst P95 latency, and individual plan summaries.
- **💾 Export Test Results as CSV**: One-click CSV export for individual test runs or aggregate folder suites directly from the sidebar.
- **⏹ Graceful Test Cancellation**: Instantly stop active tests from the Webview `⏹ Stop Test` button; active workers drain cleanly and all collected metrics are preserved in reports.
- **🤖 Built-In AI Coding Agent Skill (`gometer-test-architect`)**: Automatically provisions the skill to `.agents/skills/` and global configurations to guide AI assistants in generating valid, production-grade test suites.
- **📄 Declarative YAML with Autocomplete**: Full schema validation, hover docs, and CodeLenses ("Run Test", "Validate", "Open Dashboard") for all `*.gometer.yaml` files.

---

## 📦 Getting Started

1. Open any workspace containing `*.gometer.yaml` files (or click `🗎+` in the GoMeter sidebar to create one).
2. Click **Run Current Test Plan** in the sidebar or click the **Run Test** CodeLens directly above any scenario in your YAML file.
3. The **GoMeter Dashboard** opens automatically with live graphs and real-time request tracking.

---

## 📄 License

MIT © [Naveen Kumar Polisetty / vibeglitch](https://github.com/vibeglitch/GoMeter)
