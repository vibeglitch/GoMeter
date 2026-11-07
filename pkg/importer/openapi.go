package importer

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/naveen/gometer/pkg/config"
	"gopkg.in/yaml.v3"
)

// OpenAPISpec represents minimal OpenAPI 3.0 / Swagger 2.0 schema for import
type OpenAPISpec struct {
	OpenAPI string `json:"openapi" yaml:"openapi"`
	Swagger string `json:"swagger" yaml:"swagger"`
	Info    struct {
		Title       string `json:"title" yaml:"title"`
		Description string `json:"description" yaml:"description"`
		Version     string `json:"version" yaml:"version"`
	} `json:"info" yaml:"info"`
	Servers []struct {
		URL string `json:"url" yaml:"url"`
	} `json:"servers" yaml:"servers"`
	Host     string                                 `json:"host" yaml:"host"`         // Swagger 2.0
	BasePath string                                 `json:"basePath" yaml:"basePath"` // Swagger 2.0
	Paths    map[string]map[string]OpenAPIOperation `json:"paths" yaml:"paths"`
}

type OpenAPIOperation struct {
	Summary     string   `json:"summary" yaml:"summary"`
	OperationID string   `json:"operationId" yaml:"operationId"`
	Tags        []string `json:"tags" yaml:"tags"`
	Responses   map[string]struct {
		Description string `json:"description" yaml:"description"`
	} `json:"responses" yaml:"responses"`
}

// FromOpenAPI parses an OpenAPI 3.0 or Swagger 2.0 file (JSON or YAML) into a GoMeter TestPlan
func FromOpenAPI(filePath string) (*config.TestPlan, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read openapi file %s: %w", filePath, err)
	}

	var spec OpenAPISpec
	// Try JSON first, then YAML
	if err := json.Unmarshal(data, &spec); err != nil {
		if yamlErr := yaml.Unmarshal(data, &spec); yamlErr != nil {
			return nil, fmt.Errorf("failed to parse OpenAPI spec (neither valid JSON nor YAML): %w", err)
		}
	}

	if len(spec.Paths) == 0 {
		return nil, fmt.Errorf("no paths defined in OpenAPI specification")
	}

	// Extract BaseURL
	baseURL := "https://api.example.com"
	if len(spec.Servers) > 0 && spec.Servers[0].URL != "" {
		baseURL = strings.TrimRight(spec.Servers[0].URL, "/")
	} else if spec.Host != "" {
		scheme := "https"
		baseURL = fmt.Sprintf("%s://%s%s", scheme, spec.Host, strings.TrimRight(spec.BasePath, "/"))
	}

	title := spec.Info.Title
	if title == "" {
		title = "Imported OpenAPI Specification"
	}

	validMethods := map[string]bool{
		"get": true, "post": true, "put": true, "delete": true,
		"patch": true, "head": true, "options": true,
	}

	var requests []config.Request
	for pathStr, methodMap := range spec.Paths {
		for methodStr, op := range methodMap {
			m := strings.ToLower(methodStr)
			if !validMethods[m] {
				continue
			}

			reqName := op.Summary
			if reqName == "" {
				reqName = op.OperationID
			}
			if reqName == "" {
				reqName = fmt.Sprintf("%s %s", strings.ToUpper(m), pathStr)
			}

			req := config.Request{
				Name:   reqName,
				Method: strings.ToUpper(m),
				Path:   pathStr,
				Headers: map[string]string{
					"Accept": "application/json",
				},
				Assertions: []config.Assertion{
					{Type: "status", Expected: "2xx"},
					{Type: "latency", Expected: "<1000ms"},
				},
			}

			if m == "post" || m == "put" || m == "patch" {
				req.Headers["Content-Type"] = "application/json"
				req.Body = "{}"
			}

			requests = append(requests, req)
		}
	}

	if len(requests) == 0 {
		return nil, fmt.Errorf("no valid HTTP operations found in OpenAPI spec")
	}

	plan := &config.TestPlan{
		Name:        title,
		Description: fmt.Sprintf("Imported from OpenAPI: %s (v%s)", spec.Info.Description, spec.Info.Version),
		BaseURL:     baseURL,
		Defaults: config.Defaults{
			Headers: map[string]string{
				"User-Agent": "GoMeter/1.0",
			},
			Timeout: 15 * time.Second,
		},
		Scenarios: []config.Scenario{
			{
				Name:         "API Contract Validation",
				VirtualUsers: 5,
				Duration:     15 * time.Second,
				RampUp:       3 * time.Second,
				ThinkTime:    100 * time.Millisecond,
				Requests:     requests,
				Thresholds: []config.Threshold{
					{Metric: "p95_latency", Operator: "<", Value: 800, Unit: "ms"},
					{Metric: "error_rate", Operator: "<", Value: 1.0, Unit: "%"},
				},
			},
		},
	}

	return plan, nil
}

