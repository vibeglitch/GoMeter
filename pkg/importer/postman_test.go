package importer

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFromPostman_Success(t *testing.T) {
	jsonContent := `{
  "info": {
    "name": "User Service API",
    "description": "Postman collection for user service"
  },
  "item": [
    {
      "name": "List Users",
      "request": {
        "method": "GET",
        "header": [
          {"key": "Accept", "value": "application/json"}
        ],
        "url": {
          "raw": "https://api.mycompany.com/users?limit=10",
          "host": ["api", "mycompany", "com"],
          "path": ["users"]
        }
      }
    },
    {
      "name": "Create User",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"name\": \"John Doe\"}"
        },
        "url": {
          "raw": "https://api.mycompany.com/users",
          "host": ["api", "mycompany", "com"],
          "path": ["users"]
        }
      }
    }
  ]
}`

	tmpPath := filepath.Join(t.TempDir(), "postman.json")
	if err := os.WriteFile(tmpPath, []byte(jsonContent), 0644); err != nil {
		t.Fatal(err)
	}

	plan, err := FromPostman(tmpPath)
	if err != nil {
		t.Fatalf("FromPostman failed: %v", err)
	}

	if plan.Name != "User Service API" {
		t.Errorf("expected plan name 'User Service API', got '%s'", plan.Name)
	}

	if plan.BaseURL != "https://api.mycompany.com" {
		t.Errorf("expected BaseURL 'https://api.mycompany.com', got '%s'", plan.BaseURL)
	}

	if len(plan.Scenarios) != 1 {
		t.Fatalf("expected 1 scenario, got %d", len(plan.Scenarios))
	}

	reqs := plan.Scenarios[0].Requests
	if len(reqs) != 2 {
		t.Fatalf("expected 2 requests, got %d", len(reqs))
	}

	if reqs[0].Name != "List Users" || reqs[0].Method != "GET" || reqs[0].Path != "/users" {
		t.Errorf("request 0 mismatch: %+v", reqs[0])
	}

	if reqs[1].Name != "Create User" || reqs[1].Method != "POST" || reqs[1].Body != "{\"name\": \"John Doe\"}" {
		t.Errorf("request 1 mismatch: %+v", reqs[1])
	}
}

