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

func TestLoadFromFile_ResilientCSVResolution(t *testing.T) {
	// Create a nested directory structure: root/subfolder/test.yaml
	// and put CSV in root/data/users.csv, but test.yaml references "./data/users.csv"
	tmpDir := t.TempDir()
	subDir := filepath.Join(tmpDir, "subfolder")
	dataDir := filepath.Join(tmpDir, "data")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		t.Fatal(err)
	}
	csvPath := filepath.Join(dataDir, "users.csv")
	if err := os.WriteFile(csvPath, []byte("username,password\nalice,secret\n"), 0644); err != nil {
		t.Fatal(err)
	}

	yamlContent := `name: "CSV Subfolder Test"
base_url: "https://httpbin.org"
variables:
  csv:
    - name: "users"
      file: "./data/users.csv"
scenarios:
  - name: "S1"
    virtual_users: 1
    duration: 1s
    requests:
      - name: "Req1"
        method: "GET"
        path: "/users"
`
	yamlPath := filepath.Join(subDir, "test.yaml")
	if err := os.WriteFile(yamlPath, []byte(yamlContent), 0644); err != nil {
		t.Fatal(err)
	}

	loaded, err := LoadFromFile(yamlPath)
	if err != nil {
		t.Fatalf("LoadFromFile failed: %v", err)
	}

	if len(loaded.Variables.CSV) == 0 {
		t.Fatalf("expected CSV variable loaded")
	}

	resolved := loaded.Variables.CSV[0].File
	if resolved != csvPath {
		t.Errorf("expected CSV to resolve to %s, got %s", csvPath, resolved)
	}
}


