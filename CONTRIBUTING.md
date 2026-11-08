# Contributing to GoMeter

Thank you for your interest in contributing to **GoMeter**! We welcome contributions of all kinds: bug fixes, documentation improvements, new features, and performance enhancements.

---

## 🛠 Development Setup

### Prerequisites
- **Go 1.25+**
- **Node.js 20+** and **npm** (for building the VS Code extension)
- **Make** (optional, for convenience targets)

### Building GoMeter

```bash
# Clone the repository
git clone https://github.com/vibeglitch/GoMeter.git
cd GoMeter

# Build CLI binary into bin/gometer
make build

# Run unit tests
make test
```

### Building the VS Code Extension

```bash
# Install dependencies
cd vscode-extension
npm install

# Build extension bundle
npm run build

# Package self-contained VSIX
npm run package
```

---

## 📋 Code Standards

- **Formatting**: Always format Go code using `gofmt -s -w .`.
- **Zero-Dependency Core**: Avoid adding unnecessary external packages. Go standard library connection pooling, concurrency primitives, and serialization should be favored.
- **Error Handling**: Return descriptive, context-wrapped errors (`fmt.Errorf("...: %w", err)`). Never discard errors silently.
- **Tests**: Write unit tests alongside your code (`*_test.go`). Target >= 80% coverage for new logic.

---

## 🏷 Versioning Discipline (SemVer 2.0.0)

GoMeter strictly adheres to [Semantic Versioning 2.0.0](https://semver.org/).
All components (Go CLI, MCP Server, and VS Code extension) must remain synchronized on the exact same version string.

- **PATCH** (`1.1.0` -> `1.1.1`): Backwards-compatible bug fixes.
- **MINOR** (`1.1.0` -> `1.2.0`): Backwards-compatible new features.
- **MAJOR** (`1.1.0` -> `2.0.0`): Breaking changes to YAML schema or CLI arguments.

When preparing a release, follow the guidelines in [VERSIONING.md](VERSIONING.md) and update:
1. `cmd/gometer/main.go`
2. `vscode-extension/package.json`
3. `Makefile`
4. `release/vX.Y.Z/` catalog and `release/index.json`

---

## 📨 Submitting a Pull Request

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Make your changes, write tests, and verify:
   ```bash
   make test
   ```
3. Commit with a clear, conventional commit message:
   ```bash
   git commit -m "feat(runner): add adaptive pacing based on server response"
   ```
4. Push to your fork and submit a Pull Request targeting `main`.

> [!IMPORTANT]
> The `main` branch is protected by repository rulesets. Direct pushes are disabled, CI status checks are required, and all Pull Requests must be reviewed and accepted by `@vibeglitch`.
