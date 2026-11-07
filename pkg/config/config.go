package config

import (
	"time"

	"gopkg.in/yaml.v3"
)

// TestPlan is the root configuration for a GoMeter test
type TestPlan struct {
	Name        string      `yaml:"name" json:"name"`
	Description string      `yaml:"description,omitempty" json:"description,omitempty"`
	BaseURL     string      `yaml:"base_url" json:"base_url"`
	Variables   Variables   `yaml:"variables,omitempty" json:"variables,omitempty"`
	Defaults    Defaults    `yaml:"defaults,omitempty" json:"defaults,omitempty"`
	Scenarios   []Scenario  `yaml:"scenarios" json:"scenarios"`
	Thresholds  []Threshold `yaml:"thresholds,omitempty" json:"thresholds,omitempty"`
}

// Variables holds parameterized data sources
type Variables struct {
	Inline map[string]string `yaml:"inline,omitempty" json:"inline,omitempty"`
	CSV    []CSVSource       `yaml:"csv,omitempty" json:"csv,omitempty"`
}

// UnmarshalYAML supports both flat key-value pairs and structured inline/csv format
func (v *Variables) UnmarshalYAML(node *yaml.Node) error {
	type rawVariables struct {
		Inline map[string]string `yaml:"inline,omitempty"`
		CSV    []CSVSource       `yaml:"csv,omitempty"`
	}
	var raw rawVariables
	if err := node.Decode(&raw); err == nil && (len(raw.Inline) > 0 || len(raw.CSV) > 0) {
		v.Inline = raw.Inline
		v.CSV = raw.CSV
		return nil
	}

	var flat map[string]string
	if err := node.Decode(&flat); err == nil {
		v.Inline = flat
		return nil
	}
	return nil
}

// CSVSource defines a CSV file data feed
type CSVSource struct {
	Name      string `yaml:"name" json:"name"`
	File      string `yaml:"file" json:"file"`
	Delimiter string `yaml:"delimiter,omitempty" json:"delimiter,omitempty"`
}

// Defaults for requests across scenarios
type Defaults struct {
	Headers map[string]string `yaml:"headers,omitempty" json:"headers,omitempty"`
	Timeout time.Duration     `yaml:"timeout,omitempty" json:"timeout,omitempty"`
	Auth    *AuthConfig       `yaml:"auth,omitempty" json:"auth,omitempty"`
}

// AuthConfig supports basic, bearer token, and api key authentication
type AuthConfig struct {
	Type     string `yaml:"type" json:"type"` // "bearer", "basic", "api_key"
	Token    string `yaml:"token,omitempty" json:"token,omitempty"`
	Username string `yaml:"username,omitempty" json:"username,omitempty"`
	Password string `yaml:"password,omitempty" json:"password,omitempty"`
	Header   string `yaml:"header,omitempty" json:"header,omitempty"` // for api_key
	Value    string `yaml:"value,omitempty" json:"value,omitempty"`   // for api_key
}

// Scenario defines a load test scenario with virtual users and timing
type Scenario struct {
	Name         string        `yaml:"name" json:"name"`
	VirtualUsers int           `yaml:"virtual_users" json:"virtual_users"`
	Duration     time.Duration `yaml:"duration" json:"duration"`
	RampUp       time.Duration `yaml:"ramp_up,omitempty" json:"ramp_up,omitempty"`
	Iterations   int           `yaml:"iterations,omitempty" json:"iterations,omitempty"`
	ThinkTime    time.Duration `yaml:"think_time,omitempty" json:"think_time,omitempty"`
	Requests     []Request     `yaml:"requests" json:"requests"`
	Thresholds   []Threshold   `yaml:"thresholds,omitempty" json:"thresholds,omitempty"`
}

// Request defines a single HTTP request sampler
type Request struct {
	Name        string            `yaml:"name" json:"name"`
	Method      string            `yaml:"method" json:"method"`
	Path        string            `yaml:"path" json:"path"`
	Headers     map[string]string `yaml:"headers,omitempty" json:"headers,omitempty"`
	Body        string            `yaml:"body,omitempty" json:"body,omitempty"`
	BodyFile    string            `yaml:"body_file,omitempty" json:"body_file,omitempty"`
	QueryParams map[string]string `yaml:"query_params,omitempty" json:"query_params,omitempty"`
	Assertions  []Assertion       `yaml:"assertions,omitempty" json:"assertions,omitempty"`
	Extract     []Extraction      `yaml:"extract,omitempty" json:"extract,omitempty"`
}

// Assertion defines criteria to validate the HTTP response
type Assertion struct {
	Type     string `yaml:"type" json:"type"`                     // "status", "body_contains", "body_json", "jsonpath", "header", "latency"
	Expected string `yaml:"expected" json:"expected"`             // expected value or expression
	Path     string `yaml:"path,omitempty" json:"path,omitempty"` // JSON key/path or header key
	Query    string `yaml:"query,omitempty" json:"query,omitempty"`
	Operator string `yaml:"operator,omitempty" json:"operator,omitempty"`
}

// Extraction extracts values from response to pass to subsequent requests
type Extraction struct {
	Name   string `yaml:"name" json:"name"`                     // variable key to store
	Source string `yaml:"source" json:"source"`                 // "body_json", "header", "body_regex"
	From   string `yaml:"from,omitempty" json:"from,omitempty"`
	Path   string `yaml:"path,omitempty" json:"path,omitempty"` // JSON path, header name, or regex
	Query  string `yaml:"query,omitempty" json:"query,omitempty"`
}

// Threshold defines pass/fail SLA criteria for the scenario
type Threshold struct {
	Metric   string  `yaml:"metric" json:"metric"`     // "p95_latency", "p99_latency", "avg_latency", "error_rate", "rps"
	Operator string  `yaml:"operator" json:"operator"` // "<", "<=", ">", ">="
	Value    float64 `yaml:"value" json:"value"`
	Unit     string  `yaml:"unit,omitempty" json:"unit,omitempty"` // "ms", "s", "%"
}

