## Description
<!-- Provide a clear, concise summary of the changes proposed in this Pull Request. -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] ⚡ Performance improvement
- [ ] 🧪 Testing & CI update

## Areas Affected
- [ ] CLI Engine (`cmd/gometer`, `pkg/...`)
- [ ] Model Context Protocol (`mcp/...`)
- [ ] VS Code Extension (`vscode-extension/...`)
- [ ] Test Plans & Examples (`examples/...`)
- [ ] CI/CD & Tooling (`.github/...`, `Makefile`)

## Verification & Testing
<!-- Describe the tests you ran to verify your changes. Include commands and results. -->
```bash
make test
make build
./bin/gometer validate examples/data/real-dummy-apis.gometer.yaml
```

## Checklist
- [ ] My code follows the code style and formatting of this project (`go fmt`, `npm run lint`).
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code where necessary, particularly in complex algorithmic areas.
- [ ] I have updated the documentation / README accordingly.
- [ ] All new and existing unit tests pass locally.
- [ ] Any version bumps follow SemVer 2.0.0 and update all synchronized locations specified in `VERSIONING.md`.

