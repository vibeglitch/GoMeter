package parameterizer

import (
	"os"
	"regexp"
	"strings"
	"sync"
)

var (
	varPattern = regexp.MustCompile(`\$\{(?:var:)?([a-zA-Z0-9_]+)\}`)
	envPattern = regexp.MustCompile(`\$\{env:([a-zA-Z0-9_]+)(?::([^}]*))?\}`)
)

// Store manages variable scopes (inline, environment, CSV feed, runtime extractions)
type Store struct {
	mu     sync.RWMutex
	values map[string]string
}

// NewStore creates a new variable store
func NewStore(initial map[string]string) *Store {
	copied := make(map[string]string)
	for k, v := range initial {
		copied[k] = v
	}
	return &Store{
		values: copied,
	}
}

// Clone creates an isolated copy of the store for a virtual user
func (s *Store) Clone() *Store {
	s.mu.RLock()
	defer s.mu.RUnlock()

	copied := make(map[string]string, len(s.values))
	for k, v := range s.values {
		copied[k] = v
	}
	return &Store{
		values: copied,
	}
}

// Set stores or updates a variable
func (s *Store) Set(key, value string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.values[key] = value
}

// Get retrieves a variable by name
func (s *Store) Get(key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	val, ok := s.values[key]
	return val, ok
}

// Replace substitutes all variables in input string
func (s *Store) Replace(input string) string {
	if !strings.Contains(input, "${") {
		return input
	}

	// 1. First replace ${env:VAR}
	res := envPattern.ReplaceAllStringFunc(input, func(m string) string {
		sub := envPattern.FindStringSubmatch(m)
		if len(sub) > 1 {
			val := os.Getenv(sub[1])
			if val != "" {
				return val
			}
			if len(sub) > 2 && sub[2] != "" {
				return sub[2]
			}
		}
		return m
	})

	// 2. Then replace ${variable}
	s.mu.RLock()
	defer s.mu.RUnlock()

	res = varPattern.ReplaceAllStringFunc(res, func(m string) string {
		sub := varPattern.FindStringSubmatch(m)
		if len(sub) > 1 {
			if val, ok := s.values[sub[1]]; ok {
				return val
			}
		}
		return m
	})

	return res
}

// ReplaceMap substitutes variables across map values
func (s *Store) ReplaceMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return input
	}
	res := make(map[string]string, len(input))
	for k, v := range input {
		res[k] = s.Replace(v)
	}
	return res
}

