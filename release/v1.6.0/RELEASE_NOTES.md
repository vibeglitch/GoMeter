# GoMeter Release v1.6.0

**Release Date:** 2026-11-08  
**Adherence:** Semantic Versioning (SemVer 2.0.0)

---

## Highlights

### 1. Embedded AI Coding Agent Skill (`gometer-test-architect`)
- **Automated Skill Provisioning**:
  - Whenever the GoMeter VS Code extension is installed and activated, it automatically installs/syncs the **`gometer-test-architect`** skill into the IDE coding agent's discovery paths:
    1. Workspace Level: `.agents/skills/gometer-test-architect/` (project-specific discovery)
    2. Global Antigravity / Gemini Agent Level: `~/.gemini/config/skills/gometer-test-architect/`
    3. Global Claude Code Level: `~/.claude/skills/gometer-test-architect/`
- **Intelligent API Test Sequencing & Dependency Architecture**:
  - Teaches the IDE coding agent how to translate high-level user requirements into robust GoMeter test plans.
  - Guides multi-step API dependencies:
    - Authentication & handshake (login, token generation, API key validation)
    - Dynamic token extraction via `body_json` (JSONPath), `header`, and `regex`
    - Token chaining via `Authorization: Bearer ${token}` and `${variable}` interpolation
    - Resource creation & ID chaining across full CRUD lifecycles
  - Covers assertions (`status`, `latency`, `body_json`, `body_contains`), virtual user concurrency modeling (`virtual_users`, `ramp_up`, `think_time`), JMeter-style CSV data parameterization, and SLA performance threshold validation (`p95_latency`, `error_rate`, `min_throughput`).
- **Manual Command**:
  - Added Command Palette action: **`GoMeter: Install AI Coding Agent Skill`** (`gometer.installAgentSkill`) to allow users to force re-install or sync the skill at any time.

---

## Artifacts & Checksums (v1.6.0)

| File | SHA-256 Checksum |
|---|---|
| `gometer-1.6.0.vsix` | `9204569ebfe5b047d78804a99ae4df8f27c2843218040a8c23399e770c66b6d4` |
| `gometer-v1.6.0-linux-amd64.tar.gz` | `42992107cc3934e3f4df5ca97aa14c9219a2c2d2c310301f444984120db5a833` |
| `gometer-v1.6.0-windows-amd64.zip` | `530cc3b5afb22f13dcd712c0db8cef83a391b6499c9a625a2ed78111e0785c6e` |
| `gometer-v1.6.0-darwin-arm64.tar.gz` | `70029ff9aa29b746167ba500e7734c670eaf99acb69b9109af4a2dc25c589121` |
| `gometer-v1.6.0-darwin-amd64.tar.gz` | `23e3ae3fee4a903787624a4bf3e6e448b6f1f24d6b7dc2edccedca8d6c60077f` |
