package importer

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/naveen/gometer/pkg/config"
)

// PostmanCollection represents the minimal Postman v2.1 schema for import
type PostmanCollection struct {
	Info struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	} `json:"info"`
	Item []PostmanItem `json:"item"`
}

type PostmanItem struct {
	Name    string        `json:"name"`
	Item    []PostmanItem `json:"item,omitempty"` // For subfolders
	Request *struct {
		Method string `json:"method"`
		Header []struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		} `json:"header"`
		Body *struct {
			Mode string `json:"mode"`
			Raw  string `json:"raw"`
		} `json:"body"`
		URL struct {
			Raw  string   `json:"raw"`
			Host []string `json:"host"`
			Path []string `json:"path"`
		} `json:"url"`
	} `json:"request,omitempty"`
}

// FromPostman parses a Postman Collection v2.1 JSON file into a GoMeter TestPlan
func FromPostman(filePath string) (*config.TestPlan, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read postman collection: %w", err)
	}

	var col PostmanCollection
	if err := json.Unmarshal(data, &col); err != nil {
		return nil, fmt.Errorf("invalid postman collection json: %w", err)
	}

	var extractedReqs []config.Request
	extractItems(col.Item, &extractedReqs)

	if len(extractedReqs) == 0 {
		return nil, fmt.Errorf("no valid HTTP requests found in postman collection")
	}

	// Extract base URL from first request or default
	baseURL := "https://api.example.com"
	if len(col.Item) > 0 {
		firstURL := getFirstURL(col.Item)
		if firstURL != "" {
			if strings.HasPrefix(firstURL, "http://") || strings.HasPrefix(firstURL, "https://") {
				parts := strings.Split(firstURL, "/")
				if len(parts) >= 3 {
					baseURL = strings.Join(parts[:3], "/")
				}
			}
		}
	}

	name := col.Info.Name
	if name == "" {
		name = "Imported Postman Collection"
	}

	plan := &config.TestPlan{
		Name:        name,
		Description: col.Info.Description,
		BaseURL:     baseURL,
		Defaults: config.Defaults{
			Headers: map[string]string{
				"Content-Type": "application/json",
				"Accept":       "application/json",
			},
			Timeout: 15 * time.Second,
		},
		Scenarios: []config.Scenario{
			{
				Name:         "Postman Journey",
				VirtualUsers: 10,
				Duration:     30 * time.Second,
				RampUp:       5 * time.Second,
				ThinkTime:    100 * time.Millisecond,
				Requests:     extractedReqs,
				Thresholds: []config.Threshold{
					{Metric: "p95_latency", Operator: "<", Value: 1000, Unit: "ms"},
					{Metric: "error_rate", Operator: "<", Value: 1.0, Unit: "%"},
				},
			},
		},
	}

	return plan, nil
}

func extractItems(items []PostmanItem, target *[]config.Request) {
	for _, it := range items {
		if it.Request != nil {
			method := strings.ToUpper(it.Request.Method)
			if method == "" {
				method = "GET"
			}

			// Clean path
			path := "/" + strings.Join(it.Request.URL.Path, "/")
			path = strings.ReplaceAll(path, "//", "/")

			headers := make(map[string]string)
			for _, h := range it.Request.Header {
				if h.Key != "" {
					headers[h.Key] = h.Value
				}
			}

			var body string
			if it.Request.Body != nil && it.Request.Body.Mode == "raw" {
				body = it.Request.Body.Raw
			}

			req := config.Request{
				Name:    it.Name,
				Method:  method,
				Path:    path,
				Headers: headers,
				Body:    body,
				Assertions: []config.Assertion{
					{Type: "status", Expected: "2xx"},
					{Type: "latency", Expected: "<1000ms"},
				},
			}
			*target = append(*target, req)
		}

		if len(it.Item) > 0 {
			extractItems(it.Item, target)
		}
	}
}

func getFirstURL(items []PostmanItem) string {
	for _, it := range items {
		if it.Request != nil && it.Request.URL.Raw != "" {
			return it.Request.URL.Raw
		}
		if len(it.Item) > 0 {
			u := getFirstURL(it.Item)
			if u != "" {
				return u
			}
		}
	}
	return ""
}

