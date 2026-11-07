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

	// Resolve relative CSV files relative to test plan directory
	baseDir := filepath.Dir(filePath)
	for i := range plan.Variables.CSV {
		if !filepath.IsAbs(plan.Variables.CSV[i].File) {
			plan.Variables.CSV[i].File = filepath.Join(baseDir, plan.Variables.CSV[i].File)
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

