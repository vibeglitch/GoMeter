# GoMeter Test Plan Full Schema Reference

## Top-Level Fields
```yaml
name: string            # Required. Human readable name
description: string     # Optional. Detailed description
version: string         # Required. Schema version e.g. "1.0.0"
base_url: string        # Optional. Base URL prefixed to relative request paths

defaults:
  headers:              # Optional. Key-value default headers applied to all requests
    Content-Type: string
    Authorization: string
  timeout: duration     # Optional. Per-request timeout (e.g. 10s, 500ms)

variables:
  inline:               # Optional. Static key-value variables
    key: value
  csv:                  # Optional. Array of CSV datasets for parameterization
    - name: string      # Identifier for dataset
      file: string      # Relative or absolute path to CSV file
      delimiter: string # Default ","

scenarios:              # Required. List of scenario definitions
  - name: string
    virtual_users: int  # Concurrency count (default 1)
    duration: duration  # Run duration (e.g. 30s, 1m, 5m)
    ramp_up: duration   # Warm-up period (e.g. 5s)
    think_time: duration # Pause between requests (e.g. 100ms)
    requests:           # List of sequential HTTP requests
      - name: string
        method: string  # GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
        path: string    # Relative or absolute URL
        headers:        # Request-specific headers
          Header-Name: string
        body: string    # JSON, XML, or plain text payload
        assertions:     # Validation assertions
          - type: string # status, latency, body_json, body_contains, header
            path: string
            expected: string
        extract:        # Data extraction for chaining
          - name: string
            source: string # body_json, header, regex
            path: string
            pattern: string
    thresholds:         # SLA performance criteria
      - metric: string  # p95_latency, p99_latency, error_rate, min_throughput
        operator: string # "<", "<=", ">", ">="
        value: number
        unit: string    # "ms", "%", "rps"
```

