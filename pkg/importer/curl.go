package importer

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/naveen/gometer/pkg/config"
	"gopkg.in/yaml.v3"
)

// FromCurl parses a cURL command line string and converts it into a GoMeter TestPlan
func FromCurl(curlCmd string, testName string) (*config.TestPlan, error) {
	tokens := tokenize(curlCmd)
	if len(tokens) == 0 {
		return nil, fmt.Errorf("empty curl command")
	}

	method := "GET"
	var rawURL string
	headers := make(map[string]string)
	var body string

	for i := 0; i < len(tokens); i++ {
		t := tokens[i]
		switch t {
		case "curl":
			continue
		case "-X", "--request":
			if i+1 < len(tokens) {
				method = strings.ToUpper(tokens[i+1])
				i++
			}
		case "-H", "--header":
			if i+1 < len(tokens) {
				h := tokens[i+1]
				parts := strings.SplitN(h, ":", 2)
				if len(parts) == 2 {
					headers[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
				}
				i++
			}
		case "-d", "--data", "--data-raw", "--data-binary":
			if i+1 < len(tokens) {
				body = tokens[i+1]
				if method == "GET" {
					method = "POST"
				}
				i++
			}
		default:
			if strings.HasPrefix(t, "http://") || strings.HasPrefix(t, "https://") {
				rawURL = t
			} else if !strings.HasPrefix(t, "-") && rawURL == "" && i > 0 {
				rawURL = t
			}
		}
	}

	if rawURL == "" {
		return nil, fmt.Errorf("could not find a target URL in curl command")
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL %s: %w", rawURL, err)
	}

	baseURL := fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)
	path := parsed.Path
	if path == "" {
		path = "/"
	}
	if parsed.RawQuery != "" {
		path = path + "?" + parsed.RawQuery
	}

	if testName == "" {
		testName = fmt.Sprintf("Imported %s %s", method, parsed.Path)
	}

	plan := &config.TestPlan{
		Name:        testName,
		Description: fmt.Sprintf("Imported from cURL: %s", truncate(curlCmd, 60)),
		BaseURL:     baseURL,
		Defaults: config.Defaults{
			Headers: map[string]string{
				"Accept": "*/*",
			},
			Timeout: 15 * time.Second,
		},
		Scenarios: []config.Scenario{
			{
				Name:         "Standard Execution",
				VirtualUsers: 5,
				Duration:     10 * time.Second,
				RampUp:       2 * time.Second,
				ThinkTime:    100 * time.Millisecond,
				Requests: []config.Request{
					{
						Name:    fmt.Sprintf("%s %s", method, path),
						Method:  method,
						Path:    path,
						Headers: headers,
						Body:    body,
						Assertions: []config.Assertion{
							{Type: "status", Expected: "200"},
							{Type: "latency", Expected: "<1000ms"},
						},
					},
				},
				Thresholds: []config.Threshold{
					{Metric: "p95_latency", Operator: "<", Value: 1000, Unit: "ms"},
					{Metric: "error_rate", Operator: "<", Value: 1.0, Unit: "%"},
				},
			},
		},
	}

	return plan, nil
}

// PlanToYAML serializes a TestPlan into formatted YAML bytes
func PlanToYAML(plan *config.TestPlan) ([]byte, error) {
	return yaml.Marshal(plan)
}

func tokenize(cmd string) []string {
	var tokens []string
	var current strings.Builder
	inQuote := false
	quoteChar := byte(0)

	for i := 0; i < len(cmd); i++ {
		ch := cmd[i]

		if (ch == '"' || ch == '\'') && !inQuote {
			inQuote = true
			quoteChar = ch
			continue
		} else if inQuote && ch == quoteChar {
			inQuote = false
			quoteChar = 0
			continue
		}

		if (ch == ' ' || ch == '\t' || ch == '\n' || ch == '\\') && !inQuote {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
		} else {
			current.WriteByte(ch)
		}
	}

	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}

