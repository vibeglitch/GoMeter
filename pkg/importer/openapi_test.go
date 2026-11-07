package importer

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFromOpenAPI_JSON(t *testing.T) {
	content := `{
  "openapi": "3.0.0",
  "info": {
    "title": "Petstore API",
    "version": "1.0.0",
    "description": "Sample Petstore spec"
  },
  "servers": [
    { "url": "https://petstore.example.com/v2" }
  ],
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "responses": { "200": { "description": "OK" } }
      },
      "post": {
        "summary": "Create a pet",
        "responses": { "201": { "description": "Created" } }
      }
    }
  }
}`

	tmpPath := filepath.Join(t.TempDir(), "openapi.json")
	if err := os.WriteFile(tmpPath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	plan, err := FromOpenAPI(tmpPath)
	if err != nil {
		t.Fatalf("FromOpenAPI failed: %v", err)
	}

	if plan.Name != "Petstore API" {
		t.Errorf("expected plan name 'Petstore API', got '%s'", plan.Name)
	}

	if plan.BaseURL != "https://petstore.example.com/v2" {
		t.Errorf("expected BaseURL 'https://petstore.example.com/v2', got '%s'", plan.BaseURL)
	}

	if len(plan.Scenarios) != 1 || len(plan.Scenarios[0].Requests) != 2 {
		t.Fatalf("expected 1 scenario with 2 requests, got %d scenarios", len(plan.Scenarios))
	}
}

func TestFromOpenAPI_YAML(t *testing.T) {
	yamlContent := `openapi: "3.0.1"
info:
  title: "Inventory API"
  version: "2.1.0"
servers:
  - url: "https://inventory.example.com"
paths:
  /stock:
    get:
      summary: "Get stock levels"
`
	tmpPath := filepath.Join(t.TempDir(), "openapi.yaml")
	if err := os.WriteFile(tmpPath, []byte(yamlContent), 0644); err != nil {
		t.Fatal(err)
	}

	plan, err := FromOpenAPI(tmpPath)
	if err != nil {
		t.Fatalf("FromOpenAPI failed: %v", err)
	}

	if plan.Name != "Inventory API" {
		t.Errorf("expected plan name 'Inventory API', got '%s'", plan.Name)
	}
}

