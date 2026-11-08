# GoMeter Release v1.6.2

**Release Date:** 2026-11-08  
**Adherence:** Semantic Versioning (SemVer 2.0.0)

---

## Highlights

### 1. Official Marketplace Publisher Alignment (`vibeglitch-sdlc`)
- Synchronized the extension manifest with the official organization/publisher ID **`vibeglitch-sdlc`**.
- Resolves publisher verification and trusted publishing through GitHub Actions OIDC.

### 2. Universal All-in-One Cross-Platform Packaging
- Bundles pre-compiled, static native binaries for all major platforms inside `gometer-1.6.2.vsix`:
  - Linux `amd64`
  - Windows `amd64`
  - macOS Apple Silicon `arm64` (M1/M2/M3/M4)
  - macOS Intel `amd64`
- Enhanced runtime binary detection dynamically identifies `process.platform` and `process.arch` to launch the native executable with zero manual configuration.

---

## Release Artifacts

| Artifact | SHA256 Checksum |
|---|---|
| `gometer-1.6.2.vsix` | See checksums.txt |
| `gometer-v1.6.2-linux-amd64.tar.gz` | See checksums.txt |
| `gometer-v1.6.2-windows-amd64.zip` | See checksums.txt |
| `gometer-v1.6.2-darwin-arm64.tar.gz` | See checksums.txt |
| `gometer-v1.6.2-darwin-amd64.tar.gz` | See checksums.txt |
