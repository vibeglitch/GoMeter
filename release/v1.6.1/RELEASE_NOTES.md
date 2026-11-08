# GoMeter Release v1.6.1

**Release Date:** 2026-11-08  
**Adherence:** Semantic Versioning (SemVer 2.0.0)

---

## Highlights

### 1. Dedicated Transparent Activity Bar Icon
- Replaced the solid squircle background icon in the Activity Bar container with a dedicated, crisp 24x24 vector outline icon (`resources/activitybar.svg`).
- **Fixes**: In VS Code, Activity Bar icons use CSS masks (`-webkit-mask-image`), which painted any opaque background rectangle as a solid white box. The new icon has a transparent canvas and clean `currentColor` vector paths (speedometer arc, load needle, center hub, calibration ticks), matching native VS Code sidebar icons like Testing, Source Control, and Explorer.
- The full 512x512 multi-hue gradient squircle icon (`resources/icon.png`) remains active for the VS Code Marketplace and Extension Details view.

---

## Artifacts & Checksums (v1.6.1)

| File | SHA-256 Checksum |
|---|---|
| `gometer-1.6.1.vsix` | `546348a5b211baeba6beba49e34167fbc79a7e2d228b7daead6bf71e86a574c5` |
| `gometer-v1.6.1-linux-amd64.tar.gz` | `8c8d520a4389f060e72371fd09548393f150a600c2c20ea25904e0864a924c5b` |
| `gometer-v1.6.1-windows-amd64.zip` | `3e7fd3512e92967b1caf31a94b57c6156cfb2cb03ae9d953b4e78dfedff417f0` |
| `gometer-v1.6.1-darwin-arm64.tar.gz` | `548792fe8b80d65c02574c4ae3b07c001bef0dec04d08a9ddf7d8ed9912e7a1c` |
| `gometer-v1.6.1-darwin-amd64.tar.gz` | `d5c949327938d1aef9590d7f0005a26fe7128650f7ce57f57ecb1540593faf6a` |

