package config

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

var envVarPattern = regexp.MustCompile(`\$\{env:([a-zA-Z0-9_]+)(?::([^}]*))?\}`)

// LoadFromFile reads and parses a YAML test plan from disk
func LoadFromFile(filePath string) (*TestPlan, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read test plan file %s: %w", filePath, err)
	}

	// Expand environment variables: ${env:VAR_NAME} or ${env:VAR_NAME:default_val}
	expanded := envVarPattern.ReplaceAllStringFunc(string(data), func(match string) string {
		sub := envVarPattern.FindStringSubmatch(match)
		if len(sub) > 1 {
			val := os.Getenv(sub[1])
			if val != "" {
				return val
			}
			if len(sub) > 2 && sub[2] != "" {
				return sub[2]
			}
		}
		return ""
	})

	var plan TestPlan
	if err := yaml.Unmarshal([]byte(expanded), &plan); err != nil {
		return nil, fmt.Errorf("invalid YAML syntax in %s: %w", filePath, err)
	}

	// Resolve relative CSV files and body files relative to test plan directory with resilient fallbacks
	baseDir := filepath.Dir(filePath)
	for i := range plan.Variables.CSV {
		plan.Variables.CSV[i].File = resolveFilePath(baseDir, plan.Variables.CSV[i].File)
	}

	for i := range plan.Scenarios {
		for j := range plan.Scenarios[i].Requests {
			if plan.Scenarios[i].Requests[j].BodyFile != "" {
				plan.Scenarios[i].Requests[j].BodyFile = resolveFilePath(baseDir, plan.Scenarios[i].Requests[j].BodyFile)
			}
		}
	}

	// Validate semantics
	if errs := Validate(&plan); len(errs) > 0 {
		return &plan, fmt.Errorf("test plan validation errors:\n - %s", strings.Join(errs, "\n - "))
	}

	return &plan, nil
}

// Validate checks a TestPlan for structural and semantic validity
func Validate(plan *TestPlan) []string {
	var errs []string

	if strings.TrimSpace(plan.Name) == "" {
		errs = append(errs, "test plan must have a 'name'")
	}

	if strings.TrimSpace(plan.BaseURL) == "" {
		errs = append(errs, "test plan must have a 'base_url'")
	} else {
		if _, err := url.ParseRequestURI(plan.BaseURL); err != nil {
			errs = append(errs, fmt.Sprintf("invalid 'base_url': %s", plan.BaseURL))
		}
	}

	if len(plan.Scenarios) == 0 {
		errs = append(errs, "test plan must define at least one scenario")
	}

	for i, s := range plan.Scenarios {
		prefix := fmt.Sprintf("scenario[%d] (%s)", i, s.Name)
		if strings.TrimSpace(s.Name) == "" {
			errs = append(errs, fmt.Sprintf("scenario[%d] is missing a 'name'", i))
		}
		if s.VirtualUsers <= 0 {
			errs = append(errs, fmt.Sprintf("%s: 'virtual_users' must be > 0", prefix))
		}
		if s.Duration <= 0 && s.Iterations <= 0 {
			errs = append(errs, fmt.Sprintf("%s: must specify either 'duration' or 'iterations' > 0", prefix))
		}
		if len(s.Requests) == 0 {
			errs = append(errs, fmt.Sprintf("%s: must contain at least one request", prefix))
		}

		for j, r := range s.Requests {
			reqPrefix := fmt.Sprintf("%s request[%d] (%s)", prefix, j, r.Name)
			method := strings.ToUpper(strings.TrimSpace(r.Method))
			if method == "" {
				errs = append(errs, fmt.Sprintf("%s: 'method' cannot be empty", reqPrefix))
			} else {
				validMethods := map[string]bool{
					"GET": true, "POST": true, "PUT": true, "DELETE": true,
					"PATCH": true, "HEAD": true, "OPTIONS": true,
				}
				if !validMethods[method] {
					errs = append(errs, fmt.Sprintf("%s: unsupported HTTP method '%s'", reqPrefix, method))
				}
			}
			if strings.TrimSpace(r.Path) == "" {
				errs = append(errs, fmt.Sprintf("%s: 'path' cannot be empty", reqPrefix))
			}
		}
	}

	return errs
}

// resolveFilePath resolves a file path against multiple fallback candidates
// to ensure test plans work even when moved into nested folders or run from different working directories.
func resolveFilePath(baseDir, raw string) string {
	if raw == "" {
		return ""
	}
	if filepath.IsAbs(raw) {
		if fi, err := os.Stat(raw); err == nil && !fi.IsDir() {
			return raw
		}
	}

	cleanRaw := filepath.Clean(raw)
	baseName := filepath.Base(raw)
	parentDir := filepath.Dir(baseDir)
	grandParentDir := filepath.Dir(parentDir)

	candidates := []string{
		filepath.Join(baseDir, raw),                     // 1. Direct relative to plan dir (e.g. baseDir/data/users.csv)
		cleanRaw,                                         // 2. Relative to current working directory (e.g. ./data/users.csv)
		filepath.Join(baseDir, baseName),                // 3. Direct file in plan directory (e.g. baseDir/users.csv)
		filepath.Join(parentDir, raw),                   // 4. Relative to parent dir (e.g. examples/ + data/users.csv)
		filepath.Join(parentDir, "data", baseName),       // 5. Parent's data dir (e.g. examples/data/users.csv)
		filepath.Join(grandParentDir, raw),              // 6. Relative to grandparent dir
		filepath.Join(grandParentDir, "data", baseName), // 7. Grandparent's data dir
		filepath.Join("examples", "data", baseName),     // 8. Workspace examples/data
		filepath.Join("data", baseName),                 // 9. Workspace data/
	}

	for _, cand := range candidates {
		if fi, err := os.Stat(cand); err == nil && !fi.IsDir() {
			return cand
		}
	}

	// Default fallback to plan-relative path
	return filepath.Join(baseDir, raw)
}


