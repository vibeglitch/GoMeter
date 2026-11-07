package http

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/naveen/gometer/pkg/config"
	"github.com/naveen/gometer/pkg/parameterizer"
)

// RequestBuilder builds prepared http.Request instances
type RequestBuilder struct {
	baseURL  string
	defaults config.Defaults
}

// NewRequestBuilder constructs a request builder
func NewRequestBuilder(baseURL string, defaults config.Defaults) *RequestBuilder {
	return &RequestBuilder{
		baseURL:  strings.TrimRight(baseURL, "/"),
		defaults: defaults,
	}
}

// Build creates an *http.Request with variable substitutions and default headers applied
func (b *RequestBuilder) Build(ctx context.Context, reqDef config.Request, store *parameterizer.Store) (*http.Request, []byte, error) {
	// 1. Resolve path with variable substitution
	subPath := store.Replace(reqDef.Path)
	if !strings.HasPrefix(subPath, "/") && !strings.HasPrefix(subPath, "http://") && !strings.HasPrefix(subPath, "https://") {
		subPath = "/" + subPath
	}

	fullURL := subPath
	if !strings.HasPrefix(subPath, "http://") && !strings.HasPrefix(subPath, "https://") {
		fullURL = b.baseURL + subPath
	}

	parsedURL, err := url.Parse(fullURL)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid URL %s: %w", fullURL, err)
	}

	// 2. Query parameters
	query := parsedURL.Query()
	for k, v := range reqDef.QueryParams {
		query.Set(store.Replace(k), store.Replace(v))
	}
	parsedURL.RawQuery = query.Encode()

	// 3. Body preparation
	var bodyBytes []byte
	if reqDef.BodyFile != "" {
		filePath := store.Replace(reqDef.BodyFile)
		data, err := os.ReadFile(filePath)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to read body file %s: %w", filePath, err)
		}
		bodyBytes = []byte(store.Replace(string(data)))
	} else if reqDef.Body != "" {
		bodyBytes = []byte(store.Replace(reqDef.Body))
	}

	var bodyReader io.Reader
	if len(bodyBytes) > 0 {
		bodyReader = bytes.NewReader(bodyBytes)
	}

	method := strings.ToUpper(strings.TrimSpace(reqDef.Method))
	if method == "" {
		method = "GET"
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, parsedURL.String(), bodyReader)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create http request: %w", err)
	}

	// 4. Set default headers
	for k, v := range b.defaults.Headers {
		httpReq.Header.Set(k, store.Replace(v))
	}

	// 5. Override with request-specific headers
	for k, v := range reqDef.Headers {
		httpReq.Header.Set(store.Replace(k), store.Replace(v))
	}

	// 6. Handle Authentication
	auth := b.defaults.Auth
	if auth != nil {
		switch strings.ToLower(auth.Type) {
		case "bearer":
			token := store.Replace(auth.Token)
			if token != "" {
				httpReq.Header.Set("Authorization", "Bearer "+token)
			}
		case "basic":
			user := store.Replace(auth.Username)
			pass := store.Replace(auth.Password)
			creds := base64.StdEncoding.EncodeToString([]byte(user + ":" + pass))
			httpReq.Header.Set("Authorization", "Basic "+creds)
		case "api_key":
			headerName := store.Replace(auth.Header)
			headerVal := store.Replace(auth.Value)
			if headerName != "" && headerVal != "" {
				httpReq.Header.Set(headerName, headerVal)
			}
		}
	}

	return httpReq, bodyBytes, nil
}

