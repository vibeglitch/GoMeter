package parameterizer

import (
	"os"
	"testing"
)

func TestStore_Replace(t *testing.T) {
	os.Setenv("APP_PORT", "9090")
	defer os.Unsetenv("APP_PORT")

	store := NewStore(map[string]string{
		"host":    "localhost",
		"version": "v1",
	})

	input := "http://${host}:${env:APP_PORT}/api/${version}/items"
	expected := "http://localhost:9090/api/v1/items"

	result := store.Replace(input)
	if result != expected {
		t.Fatalf("expected '%s', got '%s'", expected, result)
	}
}

func TestStore_Clone(t *testing.T) {
	orig := NewStore(map[string]string{"foo": "bar"})
	cloned := orig.Clone()

	cloned.Set("foo", "baz")

	v1, _ := orig.Get("foo")
	v2, _ := cloned.Get("foo")

	if v1 != "bar" || v2 != "baz" {
		t.Fatalf("cloned store mutated original: v1=%s, v2=%s", v1, v2)
	}
}

