package assertion

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/naveen/gometer/pkg/config"
	"github.com/naveen/gometer/pkg/parameterizer"
)

// Result reports the outcome of evaluating an assertion
type Result struct {
	Type     string
	Expected string
	Actual   string
	Passed   bool
	Error    string
}

// Evaluator checks assertions and extracts variables
type Evaluator struct{}

// NewEvaluator creates a new assertion evaluator
func NewEvaluator() *Evaluator {
	return &Evaluator{}
}

// EvaluateAll tests all assertions defined on a request
func (e *Evaluator) EvaluateAll(assertions []config.Assertion, resp *http.Response, body []byte, latency time.Duration, store *parameterizer.Store) ([]Result, bool) {
	if len(assertions) == 0 {
		// Default rule: HTTP 2xx or 3xx is considered success if no assertions defined
		if resp != nil && resp.StatusCode >= 200 && resp.StatusCode < 400 {
			return nil, true
		}
		return []Result{{
			Type:     "status",
			Expected: "2xx/3xx",
			Actual:   fmt.Sprintf("%d", resp.StatusCode),
			Passed:   false,
			Error:    fmt.Sprintf("HTTP status %d not 2xx/3xx", resp.StatusCode),
		}}, false
	}

	allPassed := true
	var results []Result

	for _, a := range assertions {
		res := e.Evaluate(a, resp, body, latency, store)
		results = append(results, res)
		if !res.Passed {
			allPassed = false
		}
	}

	return results, allPassed
}

// Evaluate evaluates a single assertion
func (e *Evaluator) Evaluate(a config.Assertion, resp *http.Response, body []byte, latency time.Duration, store *parameterizer.Store) Result {
	expected := store.Replace(a.Expected)
	res := Result{
		Type:     a.Type,
		Expected: expected,
	}

	switch strings.ToLower(a.Type) {
	case "status":
		actualCode := 0
		if resp != nil {
			actualCode = resp.StatusCode
		}
		res.Actual = strconv.Itoa(actualCode)
		res.Passed = checkStatus(actualCode, expected, a.Operator)
		if !res.Passed {
			res.Error = fmt.Sprintf("expected status %s, got %d", expected, actualCode)
		}

	case "latency":
		res.Actual = fmt.Sprintf("%dms", latency.Milliseconds())
		res.Passed = checkLatency(latency, expected)
		if !res.Passed {
			res.Error = fmt.Sprintf("latency %v exceeded %s", latency, expected)
		}

	case "body_contains":
		bodyStr := string(body)
		res.Actual = fmt.Sprintf("length %d bytes", len(body))
		res.Passed = strings.Contains(bodyStr, expected)
		if !res.Passed {
			res.Error = fmt.Sprintf("response body does not contain '%s'", expected)
		}

	case "body_json", "jsonpath", "json":
		targetPath := a.Path
		if targetPath == "" {
			targetPath = a.Query
		}
		path := store.Replace(targetPath)
		val, found := extractJSONValue(body, path)
		res.Actual = fmt.Sprintf("%v", val)
		if !found {
			res.Passed = false
			res.Error = fmt.Sprintf("JSON path '%s' not found in response", path)
		} else {
			res.Passed = checkJSONExpected(val, expected, a.Operator)
			if !res.Passed {
				res.Error = fmt.Sprintf("JSON path '%s' value '%v' did not match expected '%s'", path, val, expected)
			}
		}

	case "header":
		path := store.Replace(a.Path)
		actualHeader := ""
		if resp != nil {
			actualHeader = resp.Header.Get(path)
		}
		res.Actual = actualHeader
		res.Passed = (actualHeader == expected) || (expected == "*" && actualHeader != "")
		if !res.Passed {
			res.Error = fmt.Sprintf("header '%s' value '%s' != '%s'", path, actualHeader, expected)
		}

	default:
		res.Passed = false
		res.Error = fmt.Sprintf("unknown assertion type: %s", a.Type)
	}

	return res
}

// ExtractAll processes response extractions and stores variables
func (e *Evaluator) ExtractAll(extractions []config.Extraction, resp *http.Response, body []byte, store *parameterizer.Store) {
	for _, ext := range extractions {
		targetPath := ext.Path
		if targetPath == "" {
			targetPath = ext.Query
		}
		source := ext.Source
		if source == "" {
			source = ext.From
		}
		switch strings.ToLower(source) {
		case "body_json", "body", "jsonpath", "json", "":
			val, found := extractJSONValue(body, targetPath)
			if found && val != nil {
				store.Set(ext.Name, fmt.Sprintf("%v", val))
			}
		case "header":
			if resp != nil {
				val := resp.Header.Get(targetPath)
				if val != "" {
					store.Set(ext.Name, val)
				}
			}
		case "body_regex":
			re, err := regexp.Compile(targetPath)
			if err == nil {
				matches := re.FindSubmatch(body)
				if len(matches) > 1 {
					store.Set(ext.Name, string(matches[1]))
				} else if len(matches) == 1 {
					store.Set(ext.Name, string(matches[0]))
				}
			}
		}
	}
}

func checkStatus(actual int, expected string, op string) bool {
	expected = strings.TrimSpace(expected)
	op = strings.TrimSpace(op)

	if expected == "2xx" {
		return actual >= 200 && actual < 300
	}
	if expected == "3xx" {
		return actual >= 300 && actual < 400
	}
	if expected == "4xx" {
		return actual >= 400 && actual < 500
	}
	if expected == "5xx" {
		return actual >= 500 && actual < 600
	}

	if op == "!=" || strings.HasPrefix(expected, "!=") {
		target := strings.TrimSpace(strings.TrimPrefix(expected, "!="))
		code, err := strconv.Atoi(target)
		if err == nil {
			return actual != code
		}
	}

	target := strings.TrimPrefix(expected, "==")
	target = strings.TrimPrefix(target, "=")
	parts := strings.Split(target, ",")
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if strings.HasPrefix(p, "!=") {
			code, err := strconv.Atoi(strings.TrimPrefix(p, "!="))
			if err == nil && actual == code {
				return false
			}
		} else {
			code, err := strconv.Atoi(p)
			if err == nil && actual == code {
				return true
			}
		}
	}
	return false
}

func checkLatency(latency time.Duration, expected string) bool {
	expected = strings.TrimSpace(expected)
	var op string
	var valStr string

	if strings.HasPrefix(expected, "<=") {
		op = "<="
		valStr = strings.TrimPrefix(expected, "<=")
	} else if strings.HasPrefix(expected, "<") {
		op = "<"
		valStr = strings.TrimPrefix(expected, "<")
	} else if strings.HasPrefix(expected, ">=") {
		op = ">="
		valStr = strings.TrimPrefix(expected, ">=")
	} else if strings.HasPrefix(expected, ">") {
		op = ">"
		valStr = strings.TrimPrefix(expected, ">")
	} else {
		op = "<"
		valStr = expected
	}

	d, err := time.ParseDuration(valStr)
	if err != nil {
		ms, err2 := strconv.ParseInt(valStr, 10, 64)
		if err2 != nil {
			return true
		}
		d = time.Duration(ms) * time.Millisecond
	}

	switch op {
	case "<":
		return latency < d
	case "<=":
		return latency <= d
	case ">":
		return latency > d
	case ">=":
		return latency >= d
	}
	return false
}

func checkJSONExpected(val interface{}, expected string, op string) bool {
	expected = strings.TrimSpace(expected)
	op = strings.TrimSpace(op)

	if expected == "not_empty" || expected == "exists" {
		if val == nil {
			return false
		}
		if s, ok := val.(string); ok && s == "" {
			return false
		}
		if arr, ok := val.([]interface{}); ok && len(arr) == 0 {
			return false
		}
		if m, ok := val.(map[string]interface{}); ok && len(m) == 0 {
			return false
		}
		return true
	}

	valStr := fmt.Sprintf("%v", val)

	if op == "!=" || strings.HasPrefix(expected, "!=") {
		target := expected
		if strings.HasPrefix(expected, "!=") {
			target = strings.TrimSpace(strings.TrimPrefix(expected, "!="))
		}
		return valStr != target
	}

	target := strings.TrimPrefix(expected, "==")
	target = strings.TrimPrefix(target, "=")
	return valStr == target
}

func extractJSONValue(body []byte, path string) (interface{}, bool) {
	if len(body) == 0 {
		return nil, false
	}

	var root interface{}
	if err := json.Unmarshal(body, &root); err != nil {
		return nil, false
	}

	cleanPath := strings.TrimPrefix(path, "$.")
	cleanPath = strings.TrimPrefix(cleanPath, "$")
	if cleanPath == "" {
		return root, true
	}

	parts := strings.Split(cleanPath, ".")
	curr := root

	for _, part := range parts {
		if part == "" {
			continue
		}

		// Check array index e.g. "data[0]"
		arrIdx := -1
		if openBracket := strings.Index(part, "["); openBracket != -1 {
			closeBracket := strings.Index(part, "]")
			if closeBracket > openBracket {
				idxStr := part[openBracket+1 : closeBracket]
				idx, err := strconv.Atoi(idxStr)
				if err == nil {
					arrIdx = idx
					part = part[:openBracket]
				}
			}
		}

		if part != "" {
			m, ok := curr.(map[string]interface{})
			if !ok {
				return nil, false
			}
			curr, ok = m[part]
			if !ok {
				return nil, false
			}
		}

		if arrIdx >= 0 {
			arr, ok := curr.([]interface{})
			if !ok || arrIdx >= len(arr) {
				return nil, false
			}
			curr = arr[arrIdx]
		}
	}

	return curr, true
}

