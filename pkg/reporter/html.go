package reporter

import (
	"encoding/json"
	"fmt"
	"html/template"
	"os"
	"path/filepath"

	"github.com/naveen/gometer/pkg/metrics"
)

const htmlReportTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GoMeter Report: {{.TestName}}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-hover: #273549;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 24px; line-height: 1.5; }
    .header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .title { font-size: 26px; font-weight: 700; color: var(--primary); }
    .badge { padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; }
    .badge-pass { background: rgba(34, 197, 94, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
    .card-label { font-size: 13px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
    .card-val { font-size: 28px; font-weight: 700; }
    
    .charts-row { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
    
    .table-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
    .table-header { padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th { background: #182234; color: var(--text-muted); padding: 12px 16px; font-weight: 600; }
    td { padding: 12px 16px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    tr.clickable:hover { background: var(--card-hover); cursor: pointer; }

    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      font-family: monospace;
    }
    .badge-2xx { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .badge-err { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .badge-method {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
    }
    .method-GET { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .method-POST { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .method-PUT { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .method-DELETE { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    /* Modal / Inspector Dialog */
    .modal-backdrop {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(2px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 10px;
      width: 100%;
      max-width: 820px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
    .modal-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .modal-close:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .modal-tabs {
      display: flex;
      gap: 4px;
      padding: 0 20px;
      border-bottom: 1px solid var(--border);
      background: #182234;
    }
    .modal-tab {
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .modal-tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      font-size: 13px;
      flex: 1;
    }
    .code-block {
      background: #020617;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 260px;
      overflow-y: auto;
      color: #e2e8f0;
    }
    .kv-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .kv-table th { background: #0f172a; padding: 6px 10px; color: var(--text-muted); }
    .kv-table td { padding: 6px 10px; border-bottom: 1px solid #334155; font-family: monospace; }
    .section-subtitle {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin: 12px 0 6px 0;
    }
    .assertion-item {
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .assertion-pass { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #86efac; }
    .assertion-fail { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">GoMeter Report &mdash; {{.TestName}}</h1>
      <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Executed: {{.StartTime.Format "2006-01-02 15:04:05"}} | Duration: {{.Duration}}</p>
    </div>
    <div>
      {{if .Passed}}
      <span class="badge badge-pass">ALL TESTS PASSED</span>
      {{else}}
      <span class="badge badge-fail">FAILED (SLA BREACHED)</span>
      {{end}}
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Total Requests</div>
      <div class="card-val">{{.TotalReqs}}</div>
    </div>
    <div class="card">
      <div class="card-label">Throughput (RPS)</div>
      <div class="card-val" style="color: var(--primary);">{{.RPS}}</div>
    </div>
    <div class="card">
      <div class="card-label">Error Rate</div>
      <div class="card-val" style="color: {{if eq .FailedReqs 0}}var(--success){{else}}var(--danger){{end}};">{{.ErrorRate}}%</div>
    </div>
    <div class="card">
      <div class="card-label">Avg Latency</div>
      <div class="card-val">{{.AvgLatency}}</div>
    </div>
    <div class="card">
      <div class="card-label">p95 Latency</div>
      <div class="card-val">{{.P95Latency}}</div>
    </div>
    <div class="card">
      <div class="card-label">p99 Latency</div>
      <div class="card-val">{{.P99Latency}}</div>
    </div>
  </div>

  <div class="charts-row">
    <div class="card">
      <div class="card-label">Latency Percentiles Distribution (ms)</div>
      <canvas id="latencyChart" style="max-height: 240px;"></canvas>
    </div>
  </div>

  <div class="table-container">
    <div class="table-header">Requests Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Request</th>
          <th>Method</th>
          <th>Count</th>
          <th>Success Rate</th>
          <th>Avg Latency</th>
          <th>p95 Latency</th>
          <th>p99 Latency</th>
        </tr>
      </thead>
      <tbody>
        {{range .Scenarios}}
          {{range .Requests}}
          <tr>
            <td><strong>{{.Name}}</strong></td>
            <td><span class="badge-method method-{{.Method}}">{{.Method}}</span></td>
            <td>{{.Count}}</td>
            <td>{{.SuccessRate}}%</td>
            <td>{{.AvgLatency}}</td>
            <td>{{.P95Latency}}</td>
            <td>{{.P99Latency}}</td>
          </tr>
          {{end}}
        {{end}}
      </tbody>
    </table>
  </div>

  {{if .Thresholds}}
  <div class="table-container">
    <div class="table-header">SLA Thresholds</div>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Condition</th>
          <th>Target</th>
          <th>Actual</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {{range .Thresholds}}
        <tr>
          <td>{{.Metric}}</td>
          <td>{{.Operator}}</td>
          <td>{{.Expected}} {{.Unit}}</td>
          <td>{{.Actual}} {{.Unit}}</td>
          <td>
            {{if .Passed}}
            <span class="badge badge-pass">PASS</span>
            {{else}}
            <span class="badge badge-fail">FAIL</span>
            {{end}}
          </td>
        </tr>
        {{end}}
      </tbody>
    </table>
  </div>
  {{end}}

  <!-- Request Inspector Section -->
  {{if .Samples}}
  <div class="table-container">
    <div class="table-header">
      <span>Request & Response Inspector (Click any row to inspect details)</span>
      <span style="font-size: 13px; color: var(--text-muted);">{{len .Samples}} samples recorded</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Method</th>
          <th>URL / Path</th>
          <th>Latency</th>
          <th>Scenario</th>
          <th>Inspect</th>
        </tr>
      </thead>
      <tbody>
        {{range $index, $sample := .Samples}}
        <tr class="clickable" onclick="openSampleModal({{$index}})">
          <td>
            {{if and (ge $sample.StatusCode 200) (lt $sample.StatusCode 400) $sample.Passed}}
            <span class="badge-status badge-2xx">{{$sample.StatusCode}} OK</span>
            {{else}}
            <span class="badge-status badge-err">{{$sample.StatusCode}} FAIL</span>
            {{end}}
          </td>
          <td><span class="badge-method method-{{$sample.Method}}">{{$sample.Method}}</span></td>
          <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="{{$sample.URL}}">{{$sample.URL}}</td>
          <td>{{$sample.Latency}}</td>
          <td style="color: var(--text-muted);">{{$sample.ScenarioName}}</td>
          <td><span style="color: var(--primary); font-size: 12px; font-weight: 600;">Inspect 🔍</span></td>
        </tr>
        {{end}}
      </tbody>
    </table>
  </div>
  {{end}}

  <!-- Modal Dialog for Request Inspection -->
  <div id="inspectModal" class="modal-backdrop" onclick="closeModalOnBackdrop(event)">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <span id="modalMethod" class="badge-method method-GET">GET</span>
          <span id="modalUrl" style="word-break: break-all; font-size: 14px;"></span>
          <span id="modalStatus" class="badge-status badge-2xx">200 OK</span>
          <span id="modalLatency" style="color: var(--text-muted); font-size: 12px; margin-left: 6px;"></span>
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-tabs">
        <div id="tabBtnReq" class="modal-tab active" onclick="switchTab('request')">Request</div>
        <div id="tabBtnResp" class="modal-tab" onclick="switchTab('response')">Response</div>
        <div id="tabBtnAssert" class="modal-tab" onclick="switchTab('assertions')">Assertions</div>
      </div>
      <div class="modal-body">
        <div id="tabContentReq">
          <div class="section-subtitle">Request Headers</div>
          <table class="kv-table">
            <thead><tr><th style="width: 35%;">Header</th><th>Value</th></tr></thead>
            <tbody id="modalReqHeaders"></tbody>
          </table>
          <div class="section-subtitle">Request Payload</div>
          <div id="modalReqBody" class="code-block">None</div>
        </div>

        <div id="tabContentResp" style="display: none;">
          <div class="section-subtitle">Response Headers</div>
          <table class="kv-table">
            <thead><tr><th style="width: 35%;">Header</th><th>Value</th></tr></thead>
            <tbody id="modalRespHeaders"></tbody>
          </table>
          <div class="section-subtitle">Response Body</div>
          <div id="modalRespBody" class="code-block">Empty response</div>
        </div>

        <div id="tabContentAssert" style="display: none;">
          <div class="section-subtitle">Assertion Validations</div>
          <div id="modalAssertions">No assertions evaluated</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Latency Percentile Chart (Full width, no pie chart)
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels: ['Min', 'Avg', 'p50', 'p90', 'p95', 'p99', 'Max'],
        datasets: [{
          label: 'Latency (ms)',
          data: [
            {{.MinLatency.Milliseconds}},
            {{.AvgLatency.Milliseconds}},
            {{.P50Latency.Milliseconds}},
            {{.P90Latency.Milliseconds}},
            {{.P95Latency.Milliseconds}},
            {{.P99Latency.Milliseconds}},
            {{.MaxLatency.Milliseconds}}
          ],
          backgroundColor: '#38bdf8',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
          x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
        }
      }
    });

    const samplesData = {{.SamplesJSON}};

    function openSampleModal(idx) {
      if (!samplesData || !samplesData[idx]) return;
      const s = samplesData[idx];

      const method = s.method || 'GET';
      const methodEl = document.getElementById('modalMethod');
      methodEl.innerText = method;
      methodEl.className = 'badge-method method-' + method;

      document.getElementById('modalUrl').innerText = s.url || s.request_name || '';

      const isPass = (s.status_code >= 200 && s.status_code < 400 && s.passed);
      const statusEl = document.getElementById('modalStatus');
      statusEl.innerText = (s.status_code || 0) + (isPass ? ' OK' : ' FAIL');
      statusEl.className = 'badge-status ' + (isPass ? 'badge-2xx' : 'badge-err');

      document.getElementById('modalLatency').innerText = ((s.latency || 0) / 1000000).toFixed(1) + 'ms';

      // Request Headers
      const reqHBody = document.getElementById('modalReqHeaders');
      reqHBody.innerHTML = '';
      if (s.request_headers && Object.keys(s.request_headers).length > 0) {
        Object.entries(s.request_headers).forEach(([k, v]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td style="color: var(--primary);">' + k + '</td><td>' + v + '</td>';
          reqHBody.appendChild(tr);
        });
      } else {
        reqHBody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">No custom request headers</td></tr>';
      }

      // Request Body
      document.getElementById('modalReqBody').innerText = s.request_body || '(No request body)';

      // Response Headers
      const respHBody = document.getElementById('modalRespHeaders');
      respHBody.innerHTML = '';
      if (s.response_headers && Object.keys(s.response_headers).length > 0) {
        Object.entries(s.response_headers).forEach(([k, v]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td style="color: var(--primary);">' + k + '</td><td>' + v + '</td>';
          respHBody.appendChild(tr);
        });
      } else {
        respHBody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">No response headers captured</td></tr>';
      }

      // Response Body
      let formattedResp = s.response_body || (s.error ? 'Error: ' + s.error : '(Empty response)');
      try {
        const parsed = JSON.parse(formattedResp);
        formattedResp = JSON.stringify(parsed, null, 2);
      } catch {}
      document.getElementById('modalRespBody').innerText = formattedResp;

      // Assertions
      const assertContainer = document.getElementById('modalAssertions');
      assertContainer.innerHTML = '';
      if (s.assertions && s.assertions.length > 0) {
        s.assertions.forEach(msg => {
          const pass = msg.includes('[PASS]');
          const div = document.createElement('div');
          div.className = 'assertion-item ' + (pass ? 'assertion-pass' : 'assertion-fail');
          div.innerHTML = '<span>' + (pass ? '✓' : '✗') + '</span> <span>' + msg + '</span>';
          assertContainer.appendChild(div);
        });
      } else {
        assertContainer.innerHTML = '<div style="color: var(--text-muted);">No explicit assertions defined (Status 2xx implied: ' + (s.passed ? 'PASS' : 'FAIL') + ')</div>';
      }

      switchTab('request');
      document.getElementById('inspectModal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('inspectModal').style.display = 'none';
    }

    function closeModalOnBackdrop(e) {
      if (e.target.id === 'inspectModal') {
        closeModal();
      }
    }

    function switchTab(tab) {
      document.getElementById('tabBtnReq').className = 'modal-tab' + (tab === 'request' ? ' active' : '');
      document.getElementById('tabBtnResp').className = 'modal-tab' + (tab === 'response' ? ' active' : '');
      document.getElementById('tabBtnAssert').className = 'modal-tab' + (tab === 'assertions' ? ' active' : '');

      document.getElementById('tabContentReq').style.display = tab === 'request' ? 'block' : 'none';
      document.getElementById('tabContentResp').style.display = tab === 'response' ? 'block' : 'none';
      document.getElementById('tabContentAssert').style.display = tab === 'assertions' ? 'block' : 'none';
    }
  </script>
</body>
</html>`

// ExportHTML generates a standalone HTML report
func ExportHTML(report *metrics.Report, filePath string) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}

	tmpl, err := template.New("report").Parse(htmlReportTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse HTML template: %w", err)
	}

	f, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create report file %s: %w", filePath, err)
	}
	defer f.Close()

	samplesBytes, err := json.Marshal(report.Samples)
	if err != nil {
		samplesBytes = []byte("[]")
	}

	data := struct {
		*metrics.Report
		SamplesJSON template.JS
	}{
		Report:      report,
		SamplesJSON: template.JS(string(samplesBytes)),
	}

	if err := tmpl.Execute(f, data); err != nil {
		return fmt.Errorf("failed to render HTML report: %w", err)
	}

	return nil
}
