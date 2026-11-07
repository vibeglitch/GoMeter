package importer

import (
	"testing"
)

func TestFromCurl_PostJSON(t *testing.T) {
	cmd := `curl -X POST https://api.mycompany.com/v1/checkout -H "Content-Type: application/json" -H "Authorization: Bearer mySecretToken" -d '{"cartId": "123", "amount": 99.50}'`

	plan, err := FromCurl(cmd, "Checkout Test")
	if err != nil {
		t.Fatalf("FromCurl failed: %v", err)
	}

	if plan.BaseURL != "https://api.mycompany.com" {
		t.Errorf("expected BaseURL 'https://api.mycompany.com', got '%s'", plan.BaseURL)
	}

	if len(plan.Scenarios) != 1 || len(plan.Scenarios[0].Requests) != 1 {
		t.Fatalf("expected 1 scenario with 1 request")
	}

	req := plan.Scenarios[0].Requests[0]
	if req.Method != "POST" {
		t.Errorf("expected method POST, got %s", req.Method)
	}

	if req.Path != "/v1/checkout" {
		t.Errorf("expected path /v1/checkout, got %s", req.Path)
	}

	if req.Headers["Content-Type"] != "application/json" {
		t.Errorf("expected Content-Type header 'application/json', got '%s'", req.Headers["Content-Type"])
	}

	if req.Body != `{"cartId": "123", "amount": 99.50}` {
		t.Errorf("expected payload '%s', got '%s'", `{"cartId": "123", "amount": 99.50}`, req.Body)
	}
}

