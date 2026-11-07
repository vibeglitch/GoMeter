# GoMeter Release v1.0.0

**Release Date:** 2026-11-07  
**Status:** General Availability (GA)

---

## Highlights

- **Go Core Engine**: Ultra high-performance API load and functional testing engine replacing Apache JMeter.
- **Model Context Protocol (MCP)**: Native integration with Claude Desktop, Cursor, and VS Code Copilot via 5 tools (`run_test`, `validate_test`, `create_test`, `analyze_results`, `list_tests`), specification resources, and prompts.
- **VS Code Extension (VSIX)**: 100% self-contained extension with pre-bundled static Go binaries, real-time Chart.js live webview dashboard, CodeLenses, and AI test generation.
- **cURL Importer**: `gometer import --curl "curl -X POST ..."` converts existing cURL commands directly into GoMeter YAML test plans.
- **Parameterization**: CSV data feeds, dynamic variable evaluation, and response token chaining.
- **Multi-Platform Support**: Static native binaries available for Linux (amd64), Windows (amd64), macOS (Apple Silicon arm64), and macOS (Intel amd64).

---

## Artifacts & Checksums

| Platform / Artifact | File | SHA256 Checksum |
|---|---|---|
| **VS Code Extension** | `gometer-1.0.0.vsix` | `7711e06a91fddbb2d3188087db0d84da229a1f2714d6092561e9c25e4442e36d` |
| **Linux (x86_64)** | `gometer-v1.0.0-linux-amd64.tar.gz` | `ffd07347a63f150e14c02623a39ffcd5fcc5f26c71f60639de6eb47cee240217` |
| **Windows (x64)** | `gometer-v1.0.0-windows-amd64.zip` | `12c62bad3c6cfac3b3901fcc94fe5206ead920b4f6476b5220a2bd1907f8edb2` |
| **macOS (Apple Silicon)** | `gometer-v1.0.0-darwin-arm64.tar.gz` | `ae7a04fa4660b9220d4645e9743e2e2626a69725bb80a60cf2ad573fc27807b4` |
| **macOS (Intel)** | `gometer-v1.0.0-darwin-amd64.tar.gz` | `a5eafd12ac4febb71977363aa613b258e220304c6960ecf7685e06041397fcf1` |

---

## Quick Installation

### Install VS Code Extension
```bash
code --install-extension release/v1.0.0/gometer-1.0.0.vsix
```

### Install CLI (Linux)
```bash
tar -xzf release/v1.0.0/gometer-v1.0.0-linux-amd64.tar.gz
sudo mv gometer /usr/local/bin/
gometer version
```

