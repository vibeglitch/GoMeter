package assertion

import (
	"net/http"
	"testing"
	"time"

	"github.com/naveen/gometer/pkg/config"
	"github.com/naveen/gometer/pkg/parameterizer"
)

func TestAssertion_Status(t *testing.T) {
	eval := NewEvaluator()
	store := parameterizer.NewStore(nil)

	resp := &http.Response{StatusCode: 200}
	res := eval.Evaluate(config.Assertion{
		Type:     "status",
		Expected: "200",
	}, resp, nil, 50*time.Millisecond, store)

	if !res.Passed {
		t.Fatalf("expected status assertion to pass, got error: %s", res.Error)
	}

	resFail := eval.Evaluate(config.Assertion{
		Type:     "status",
		Expected: "201",
	}, resp, nil, 50*time.Millisecond, store)

	if resFail.Passed {
		t.Fatal("expected status 201 assertion to fail for status 200")
	}
}

func TestAssertion_Latency(t *testing.T) {
	eval := NewEvaluator()
	store := parameterizer.NewStore(nil)

	res := eval.Evaluate(config.Assertion{
		Type:     "latency",
		Expected: "<500ms",
	}, nil, nil, 120*time.Millisecond, store)

	if !res.Passed {
		t.Fatalf("expected latency assertion to pass, got error: %s", res.Error)
	}

	resFail := eval.Evaluate(config.Assertion{
		Type:     "latency",
		Expected: "<100ms",
	}, nil, nil, 120*time.Millisecond, store)

	if resFail.Passed {
		t.Fatal("expected latency <100ms assertion to fail for 120ms")
	}
}

func TestAssertion_BodyJSON_And_Extract(t *testing.T) {
	eval := NewEvaluator()
	store := parameterizer.NewStore(nil)

	jsonBody := []byte(`{"user": {"id": 42, "name": "Alice"}, "items": ["a", "b"]}`)

	res := eval.Evaluate(config.Assertion{
		Type:     "body_json",
		Path:     "$.user.id",
		Expected: "42",
	}, nil, jsonBody, 10*time.Millisecond, store)

	if !res.Passed {
		t.Fatalf("expected body_json assertion to pass, got error: %s", res.Error)
	}

	// Test extraction
	eval.ExtractAll([]config.Extraction{
		{Name: "user_name", Source: "body_json", Path: "$.user.name"},
		{Name: "first_item", Source: "body_json", Path: "$.items[0]"},
	}, nil, jsonBody, store)

	val1, _ := store.Get("user_name")
	val2, _ := store.Get("first_item")

	if val1 != "Alice" || val2 != "a" {
		t.Fatalf("extraction failed: user_name=%s, first_item=%s", val1, val2)
	}
}

