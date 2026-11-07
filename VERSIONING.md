# GoMeter Versioning Standards & Policy

This project strictly adheres to **Semantic Versioning (SemVer 2.0.0)** across all components:
- Go CLI & Core Test Engine (`github.com/naveen/gometer`)
- Model Context Protocol (MCP) Server (`gometer mcp`)
- VS Code Extension (`gometer-x.y.z.vsix`)

---

## 1. Version Format

Versions are expressed as:

$$\text{MAJOR}.\text{MINOR}.\text{PATCH}$$

Example: `1.0.0`

### Increment Rules

1. **MAJOR version** (e.g., `1.0.0` -> `2.0.0`) MUST be incremented when:
   - Incompatible, breaking changes are made to the YAML test plan schema.
   - Breaking changes or removals occur in CLI command-line flags or syntax.
   - Incompatible changes occur in the MCP tool signatures or schemas (`run_test`, `create_test`, `validate_test`, `analyze_results`, `list_tests`).
   - Breaking API changes occur in public Go exported packages (`pkg/config`, `pkg/runner`, `pkg/metrics`, `pkg/assertion`, `pkg/http`, `pkg/parameterizer`).

2. **MINOR version** (e.g., `1.0.0` -> `1.1.0`) MUST be incremented when:
   - New backward-compatible features or assertions are added (e.g., gRPC support, WebSocket samplers, OpenAPI/Postman importers).
   - New MCP tools, resources, or prompts are introduced without breaking existing ones.
   - New VS Code extension commands, views, or telemetry visualization features are added.
   - Performance enhancements or optimizations are introduced without altering schemas.

3. **PATCH version** (e.g., `1.0.0` -> `1.0.1`) MUST be incremented when:
   - Backward-compatible bug fixes are applied (e.g., connection leak resolution, histogram rounding fixes, race condition fixes).
   - Minor documentation, styling, or UI adjustments are made.

---

## 2. Synchronization Requirement

All modules in this repository **must remain synchronized** on the identical version string:

| File Location | Target Identifier | Current |
|---|---|---|
| `cmd/gometer/main.go` | `var version` | `1.3.0` |
| `mcp/server.go` | `Implementation.Version` | `1.3.0` |
| `vscode-extension/package.json` | `"version"` | `1.3.0` |
| VSIX Artifact | `gometer-<version>.vsix` | `gometer-1.3.0.vsix` |

Whenever a new release or version bump is prepared, all four locations **MUST** be updated simultaneously to prevent divergence between the CLI, the MCP server, and the VS Code extension.

---

## 3. Git Tagging & Release Workflow

Every release must have a matching git tag:
```bash
git tag -a v1.0.0 -m "Release v1.0.0: Initial production release of GoMeter"
```

### Pre-Release Checklist
Before tagging or releasing any version:
1. `make test` must pass 100% of unit tests across all packages.
2. `make release VERSION=x.y.z` generates all cross-platform binaries, VSIX, and checksums in `release/vx.y.z/`.
3. Verify CLI output: `./bin/gometer version` outputs `GoMeter vx.y.z`.

---

## 4. Release Directory Structure

All released packages and binaries MUST be preserved in the `release/` directory under their semantic version tag:

```
release/
├── index.json                        # Global catalog of all released versions
├── gometer-1.0.0.vsix                # Latest VSIX package
└── v1.0.0/                           # Version-specific archive folder
    ├── gometer-1.0.0.vsix            # Bundled VS Code Extension for v1.0.0
    ├── gometer-v1.0.0-linux-amd64.tar.gz
    ├── gometer-v1.0.0-windows-amd64.zip
    ├── gometer-v1.0.0-darwin-arm64.tar.gz
    ├── gometer-v1.0.0-darwin-amd64.tar.gz
    ├── checksums.txt                 # SHA256 verification hashes
    └── RELEASE_NOTES.md              # Detailed release notes and changelog
```

Run `make release VERSION=x.y.z` to build and package a release.

