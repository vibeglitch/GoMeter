.PHONY: all build test clean vsix release

VERSION ?= 1.6.2
TOOLS_DIR := $(CURDIR)/.tools
GO := $(TOOLS_DIR)/go/bin/go
export PATH := $(TOOLS_DIR)/go/bin:$(PATH)
export GOPATH := $(TOOLS_DIR)/gopath
export CGO_ENABLED := 0

all: build test

build:
	@mkdir -p bin
	$(GO) build -mod=vendor -ldflags="-s -w" -o bin/gometer ./cmd/gometer

test:
	$(GO) test -mod=vendor -v ./pkg/... ./mcp/...

vsix:
	@mkdir -p vscode-extension/bin
	GOOS=linux GOARCH=amd64 $(GO) build -mod=vendor -ldflags="-s -w" -o vscode-extension/bin/gometer-linux-amd64 ./cmd/gometer
	@cp vscode-extension/bin/gometer-linux-amd64 vscode-extension/bin/gometer
	GOOS=windows GOARCH=amd64 $(GO) build -mod=vendor -ldflags="-s -w" -o vscode-extension/bin/gometer-windows-amd64.exe ./cmd/gometer
	@cp vscode-extension/bin/gometer-windows-amd64.exe vscode-extension/bin/gometer.exe
	GOOS=darwin GOARCH=arm64 $(GO) build -mod=vendor -ldflags="-s -w" -o vscode-extension/bin/gometer-darwin-arm64 ./cmd/gometer
	GOOS=darwin GOARCH=amd64 $(GO) build -mod=vendor -ldflags="-s -w" -o vscode-extension/bin/gometer-darwin-amd64 ./cmd/gometer
	@cd vscode-extension && npm run build && npx @vscode/vsce package --no-dependencies
	@cp vscode-extension/gometer-$(VERSION).vsix ./

release: test
	@mkdir -p release/v$(VERSION)/build_tmp bin vscode-extension/bin
	$(GO) build -mod=vendor -ldflags="-s -w" -o bin/gometer ./cmd/gometer
	GOOS=linux GOARCH=amd64 $(GO) build -mod=vendor -ldflags="-s -w" -o release/v$(VERSION)/build_tmp/gometer ./cmd/gometer
	tar -czf release/v$(VERSION)/gometer-v$(VERSION)-linux-amd64.tar.gz -C release/v$(VERSION)/build_tmp gometer
	cp release/v$(VERSION)/build_tmp/gometer vscode-extension/bin/gometer-linux-amd64
	cp release/v$(VERSION)/build_tmp/gometer vscode-extension/bin/gometer
	rm -f release/v$(VERSION)/build_tmp/gometer
	GOOS=windows GOARCH=amd64 $(GO) build -mod=vendor -ldflags="-s -w" -o release/v$(VERSION)/build_tmp/gometer.exe ./cmd/gometer
	(cd release/v$(VERSION)/build_tmp && zip -q ../gometer-v$(VERSION)-windows-amd64.zip gometer.exe)
	cp release/v$(VERSION)/build_tmp/gometer.exe vscode-extension/bin/gometer-windows-amd64.exe
	cp release/v$(VERSION)/build_tmp/gometer.exe vscode-extension/bin/gometer.exe
	rm -f release/v$(VERSION)/build_tmp/gometer.exe
	GOOS=darwin GOARCH=arm64 $(GO) build -mod=vendor -ldflags="-s -w" -o release/v$(VERSION)/build_tmp/gometer ./cmd/gometer
	tar -czf release/v$(VERSION)/gometer-v$(VERSION)-darwin-arm64.tar.gz -C release/v$(VERSION)/build_tmp gometer
	cp release/v$(VERSION)/build_tmp/gometer vscode-extension/bin/gometer-darwin-arm64
	rm -f release/v$(VERSION)/build_tmp/gometer
	GOOS=darwin GOARCH=amd64 $(GO) build -mod=vendor -ldflags="-s -w" -o release/v$(VERSION)/build_tmp/gometer ./cmd/gometer
	tar -czf release/v$(VERSION)/gometer-v$(VERSION)-darwin-amd64.tar.gz -C release/v$(VERSION)/build_tmp gometer
	cp release/v$(VERSION)/build_tmp/gometer vscode-extension/bin/gometer-darwin-amd64
	rm -f release/v$(VERSION)/build_tmp/gometer
	rm -rf release/v$(VERSION)/build_tmp
	@cd vscode-extension && npm run build && npx @vscode/vsce package --no-dependencies
	@cp vscode-extension/gometer-$(VERSION).vsix release/v$(VERSION)/
	@cp vscode-extension/gometer-$(VERSION).vsix release/
	@cp vscode-extension/gometer-$(VERSION).vsix ./
	@(cd release/v$(VERSION) && sha256sum gometer-* > checksums.txt)
	@echo "Release v$(VERSION) packaged successfully in release/v$(VERSION)/"
clean:
	@rm -rf bin reports vscode-extension/dist vscode-extension/*.vsix

