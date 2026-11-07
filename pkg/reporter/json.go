package reporter

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/naveen/gometer/pkg/metrics"
)

// ExportJSON writes the report to a JSON file
func ExportJSON(report *metrics.Report, filePath string) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}

	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal report to JSON: %w", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write JSON report to %s: %w", filePath, err)
	}

	return nil
}

