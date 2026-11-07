package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestValidate_ValidPlan(t *testing.T) {
	plan := &TestPlan{
		Name:    "Test API",
		BaseURL: "https://httpbin.org",
		Scenarios: []Scenario{
			{
				Name:         "Scenario 1",
				VirtualUsers: 5,
				Duration:     10 * time.Second,
				Requests: []Request{
					{
						Name:   "Get User",
						Method: "GET",
						Path:   "/users",
					},
				},
			},
		},
	}

	errs := Validate(plan)
	if len(errs) != 0 {
		t.Fatalf("expected 0 errors, got: %v", errs)
	}
}

func TestValidate_MissingFields(t *testing.T) {
	plan := &TestPlan{}
	errs := Validate(plan)
	if len(errs) == 0 {
		t.Fatal("expected validation errors for empty plan, got none")
	}
}

func TestLoadFromFile_WithEnvVar(t *testing.T) {
	os.Setenv("GOMETER_TEST_BASE_URL", "https://api.test.com")
	defer os.Unsetenv("GOMETER_TEST_BASE_URL")

	yamlContent := `name: "Env Test"
base_url: "${env:GOMETER_TEST_BASE_URL}"
scenarios:
  - name: "S1"
    virtual_users: 2
    duration: 5s
    requests:
      - name: "Req1"
        method: "GET"
        path: "/health"
`
	tmpFile := filepath.Join(t.TempDir(), "test.yaml")
	if err := os.WriteFile(tmpFile, []byte(yamlContent), 0644); err != nil {
		t.Fatal(err)
	}

	loaded, err := LoadFromFile(tmpFile)
	if err != nil {
		t.Fatalf("LoadFromFile failed: %v", err)
	}

	if loaded.BaseURL != "https://api.test.com" {
		t.Errorf("expected expanded BaseURL 'https://api.test.com', got '%s'", loaded.BaseURL)
	}
}

