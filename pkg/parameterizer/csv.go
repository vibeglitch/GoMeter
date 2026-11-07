package parameterizer

import (
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"sync"
	"sync/atomic"

	"github.com/naveen/gometer/pkg/config"
)

// CSVManager manages one or more CSV data feeds
type CSVManager struct {
	sources map[string]*CSVDataset
}

// CSVDataset manages rows for a specific CSV file
type CSVDataset struct {
	headers []string
	rows    [][]string
	index   uint64
	mu      sync.Mutex
}

// NewCSVManager loads configured CSV files
func NewCSVManager(sources []config.CSVSource) (*CSVManager, error) {
	mgr := &CSVManager{
		sources: make(map[string]*CSVDataset),
	}

	for _, src := range sources {
		dataset, err := loadCSV(src)
		if err != nil {
			return nil, err
		}
		mgr.sources[src.Name] = dataset
	}

	return mgr, nil
}

func loadCSV(src config.CSVSource) (*CSVDataset, error) {
	f, err := os.Open(src.File)
	if err != nil {
		return nil, fmt.Errorf("failed to open CSV file %s: %w", src.File, err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	if src.Delimiter != "" && len(src.Delimiter) > 0 {
		reader.Comma = rune(src.Delimiter[0])
	}

	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV headers from %s: %w", src.File, err)
	}

	var rows [][]string
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV row in %s: %w", src.File, err)
		}
		rows = append(rows, record)
	}

	if len(rows) == 0 {
		return nil, fmt.Errorf("CSV file %s contains no data rows", src.File)
	}

	return &CSVDataset{
		headers: headers,
		rows:    rows,
	}, nil
}

// NextRow returns the next row as a key-value map and wraps around
func (d *CSVDataset) NextRow() map[string]string {
	if len(d.rows) == 0 {
		return nil
	}
	idx := atomic.AddUint64(&d.index, 1) - 1
	row := d.rows[idx%uint64(len(d.rows))]

	res := make(map[string]string, len(d.headers))
	for i, h := range d.headers {
		if i < len(row) {
			res[h] = row[i]
		}
	}
	return res
}

// PopulateNextRow injects the next row into a variable Store
func (m *CSVManager) PopulateNextRow(store *Store) {
	for _, dataset := range m.sources {
		row := dataset.NextRow()
		for k, v := range row {
			store.Set(k, v)
		}
	}
}

