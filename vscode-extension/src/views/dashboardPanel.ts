import * as vscode from 'vscode';
import { LiveMetricPayload } from '../services/gometerBridge';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      return DashboardPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'gometerDashboard',
      'GoMeter Live Dashboard',
      column || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    return DashboardPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'analyzeWithAI':
            vscode.commands.executeCommand('gometer.analyzeReportWithAI');
            break;
          case 'runAgain':
            vscode.commands.executeCommand('gometer.runActiveTest');
            break;
          case 'stopTest':
            vscode.commands.executeCommand('gometer.stopActiveTest');
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public sendLiveMetric(metric: LiveMetricPayload) {
    this._panel.webview.postMessage({ type: 'metric', data: metric });
  }

  public sendReport(report: any) {
    this._panel.webview.postMessage({ type: 'report', data: report });
  }

  public sendStatus(status: string) {
    this._panel.webview.postMessage({ type: 'status', data: status });
  }

  public sendLog(log: string) {
    this._panel.webview.postMessage({ type: 'log', data: log });
  }

  public dispose() {
    DashboardPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GoMeter Live Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --card-hover: #273549;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
      --method-get: #3b82f6;
      --method-post: #10b981;
      --method-put: #f59e0b;
      --method-delete: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      line-height: 1.5;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .title-group { display: flex; align-items: center; gap: 12px; }
    .brand { font-size: 22px; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 6px; }
    .status-badge {
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.2);
      color: var(--primary);
    }
    .actions { display: flex; gap: 8px; align-items: center; }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    button:hover { opacity: 0.9; }
    .btn-secondary { background: var(--card); border: 1px solid var(--border); color: var(--text); }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
    }
    .card-label { font-size: 12px; color: var(--muted); text-transform: uppercase; margin-bottom: 4px; font-weight: 600; }
    .card-val { font-size: 24px; font-weight: 700; }
    .charts {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .chart-box {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      height: 240px;
    }
    .table-box {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .table-title {
      padding: 12px 16px;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .table-container { max-height: 280px; overflow-y: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: #182234; color: var(--muted); padding: 10px 14px; font-weight: 600; position: sticky; top: 0; z-index: 2; }
    td { padding: 9px 14px; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    tr.clickable:hover { background: var(--card-hover); cursor: pointer; }
    
    .badge-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
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
    
    .log-box {
      background: #020617;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      height: 120px;
      overflow-y: auto;
      color: #94a3b8;
    }

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
      animation: modalFadeIn 0.15s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
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
      color: var(--muted);
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
      color: var(--muted);
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
    .kv-table th { background: #0f172a; padding: 6px 10px; color: var(--muted); }
    .kv-table td { padding: 6px 10px; border-bottom: 1px solid #334155; font-family: monospace; }
    .section-subtitle {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
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
  <div class="top-bar">
    <div class="title-group">
      <div class="brand">⚡ GoMeter</div>
      <div id="statusBadge" class="status-badge">Ready</div>
    </div>
    <div class="actions">
      <button id="btnStop" class="btn-danger" onclick="stopTest()">⏹ Stop Test</button>
      <button class="btn-secondary" onclick="runAgain()">▶ Run Again</button>
      <button onclick="analyzeWithAI()">✨ Analyze with AI</button>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Total Requests</div>
      <div id="valTotal" class="card-val">0</div>
    </div>
    <div class="card">
      <div class="card-label">Throughput (RPS)</div>
      <div id="valRPS" class="card-val" style="color: var(--primary);">0.0</div>
    </div>
    <div class="card">
      <div class="card-label">Success Rate</div>
      <div id="valSuccessRate" class="card-val" style="color: var(--success);">100%</div>
    </div>
    <div class="card">
      <div class="card-label">Avg Latency</div>
      <div id="valAvgLatency" class="card-val">0ms</div>
    </div>
    <div class="card">
      <div class="card-label">p95 Latency</div>
      <div id="valP95" class="card-val">0ms</div>
    </div>
  </div>

  <div class="charts">
    <div class="chart-box">
      <div class="card-label">Real-Time Response Latency Timeline (ms)</div>
      <canvas id="liveLatencyChart" style="max-height: 190px;"></canvas>
    </div>
  </div>

  <!-- Endpoint Breakdown Table -->
  <div class="table-box">
    <div class="table-title">Endpoint Aggregation Summary</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Request</th>
            <th>Method</th>
            <th>Count</th>
            <th>Success Rate</th>
            <th>Avg Latency</th>
            <th>p95 Latency</th>
          </tr>
        </thead>
        <tbody id="endpointTableBody">
          <tr><td colspan="6" style="text-align:center; color: var(--muted); padding: 18px;">No test execution data yet</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Live Request Inspector Table -->
  <div class="table-box">
    <div class="table-title">
      <span>Live Request & Response Inspector (Click any row to inspect details)</span>
      <span id="inspectorCounter" style="font-size: 12px; color: var(--muted);">0 inspected</span>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Method</th>
            <th>Endpoint URL</th>
            <th>Latency</th>
            <th>Scenario</th>
            <th>Inspect</th>
          </tr>
        </thead>
        <tbody id="requestInspectorBody">
          <tr><td colspan="6" style="text-align:center; color: var(--muted); padding: 18px;">Awaiting live requests...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card-label" style="margin-bottom: 6px;">Live Execution Logs</div>
  <div id="logConsole" class="log-box"></div>

  <!-- Modal Dialog for Request Inspection -->
  <div id="inspectModal" class="modal-backdrop" onclick="closeModalOnBackdrop(event)">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <span id="modalMethod" class="badge-method method-GET">GET</span>
          <span id="modalUrl" style="word-break: break-all; font-size: 14px;"></span>
          <span id="modalStatus" class="badge-status badge-2xx">200 OK</span>
          <span id="modalLatency" style="color: var(--muted); font-size: 12px; margin-left: 6px;"></span>
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-tabs">
        <div id="tabBtnReq" class="modal-tab active" onclick="switchTab('request')">Request</div>
        <div id="tabBtnResp" class="modal-tab" onclick="switchTab('response')">Response</div>
        <div id="tabBtnAssert" class="modal-tab" onclick="switchTab('assertions')">Assertions</div>
      </div>
      <div class="modal-body">
        <!-- Request Content -->
        <div id="tabContentReq">
          <div class="section-subtitle">Request Headers</div>
          <table class="kv-table">
            <thead><tr><th style="width: 35%;">Header</th><th>Value</th></tr></thead>
            <tbody id="modalReqHeaders"></tbody>
          </table>
          <div class="section-subtitle">Request Payload</div>
          <div id="modalReqBody" class="code-block">None</div>
        </div>

        <!-- Response Content -->
        <div id="tabContentResp" style="display: none;">
          <div class="section-subtitle">Response Headers</div>
          <table class="kv-table">
            <thead><tr><th style="width: 35%;">Header</th><th>Value</th></tr></thead>
            <tbody id="modalRespHeaders"></tbody>
          </table>
          <div class="section-subtitle">Response Body</div>
          <div id="modalRespBody" class="code-block">Empty response</div>
        </div>

        <!-- Assertions Content -->
        <div id="tabContentAssert" style="display: none;">
          <div class="section-subtitle">Assertion Validations</div>
          <div id="modalAssertions">No assertions evaluated</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let totalCount = 0;
    let successCount = 0;
    let failCount = 0;
    const maxDataPoints = 35;
    const inspectedRequests = [];

    // Charts: Latency Timeline only (Pie chart removed)
    const latencyCtx = document.getElementById('liveLatencyChart');
    const latencyChart = new Chart(latencyCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Latency (ms)',
          data: [],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointBackgroundColor: '#38bdf8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'metric') {
        handleMetric(msg.data);
      } else if (msg.type === 'report') {
        handleFinalReport(msg.data);
      } else if (msg.type === 'status') {
        updateStatus(msg.data);
      } else if (msg.type === 'log') {
        appendLog(msg.data);
      }
    });

    function updateStatus(status) {
      const badge = document.getElementById('statusBadge');
      badge.innerText = status;
      if (status === 'RUNNING') {
        badge.style.background = 'rgba(56, 189, 248, 0.2)';
        badge.style.color = '#38bdf8';
        document.getElementById('btnStop').style.display = 'inline-flex';
      } else if (status === 'STOPPED') {
        badge.style.background = 'rgba(245, 158, 11, 0.2)';
        badge.style.color = '#f59e0b';
      } else if (status === 'PASSED') {
        badge.style.background = 'rgba(34, 197, 94, 0.2)';
        badge.style.color = '#22c55e';
      } else if (status === 'FAILED') {
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#ef4444';
      }
    }

    function handleMetric(m) {
      totalCount++;
      if (m.success) { successCount++; } else { failCount++; }

      document.getElementById('valTotal').innerText = totalCount;
      const rate = ((successCount / totalCount) * 100).toFixed(1);
      document.getElementById('valSuccessRate').innerText = rate + '%';

      // Update line chart
      latencyChart.data.labels.push('');
      latencyChart.data.datasets[0].data.push(m.latency_ms);
      if (latencyChart.data.labels.length > maxDataPoints) {
        latencyChart.data.labels.shift();
        latencyChart.data.datasets[0].data.shift();
      }
      latencyChart.update('none');

      // Append to inspected requests (up to 100)
      if (inspectedRequests.length < 100 || !m.success) {
        inspectedRequests.unshift(m);
        if (inspectedRequests.length > 100) {
          inspectedRequests.pop();
        }
        renderInspectorRow(m);
      }
    }

    function renderInspectorRow(m) {
      const tbody = document.getElementById('requestInspectorBody');
      if (inspectedRequests.length === 1) {
        tbody.innerHTML = '';
      }

      const tr = document.createElement('tr');
      tr.className = 'clickable';
      const idx = inspectedRequests.indexOf(m);
      tr.onclick = () => openModal(m);

      const statusCls = (m.status_code >= 200 && m.status_code < 400 && m.success) ? 'badge-2xx' : 'badge-err';
      const method = m.method || 'GET';
      const methodCls = 'method-' + method;
      const urlText = m.url || m.request_name || '-';
      const latencyText = (m.latency_ms != null ? m.latency_ms.toFixed(1) : '0') + 'ms';

      tr.innerHTML = \`
        <td><span class="badge-status \${statusCls}">\${m.status_code || 0}</span></td>
        <td><span class="badge-method \${methodCls}">\${method}</span></td>
        <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${urlText}">\${urlText}</td>
        <td>\${latencyText}</td>
        <td style="color: var(--muted);">\${m.scenario_name || '-'}</td>
        <td><span style="color: var(--primary); font-size: 12px; font-weight: 600;">Inspect 🔍</span></td>
      \`;

      tbody.insertBefore(tr, tbody.firstChild);
      document.getElementById('inspectorCounter').innerText = inspectedRequests.length + ' inspected';
    }

    function handleFinalReport(r) {
      if (!r) return;
      updateStatus(r.passed ? 'PASSED' : 'FAILED');

      document.getElementById('valTotal').innerText = r.total_requests;
      document.getElementById('valRPS').innerText = r.requests_per_second;
      document.getElementById('valSuccessRate').innerText = (100 - r.error_rate_percent).toFixed(1) + '%';
      document.getElementById('valAvgLatency').innerText = (r.avg_latency / 1000000).toFixed(1) + 'ms';
      document.getElementById('valP95').innerText = (r.p95_latency / 1000000).toFixed(1) + 'ms';

      // Endpoint breakdown
      const tbody = document.getElementById('endpointTableBody');
      tbody.innerHTML = '';
      if (r.scenarios) {
        r.scenarios.forEach(sc => {
          if (sc.requests) {
            sc.requests.forEach(req => {
              const tr = document.createElement('tr');
              tr.innerHTML = '<td><strong>' + req.name + '</strong></td>' +
                '<td><span class="badge-method method-' + req.method + '">' + req.method + '</span></td>' +
                '<td>' + req.count + '</td>' +
                '<td>' + req.success_rate + '%</td>' +
                '<td>' + (req.avg_latency / 1000000).toFixed(1) + 'ms</td>' +
                '<td>' + (req.p95_latency / 1000000).toFixed(1) + 'ms</td>';
              tbody.appendChild(tr);
            });
          }
        });
      }

      // If report contains detailed samples, populate inspector if empty
      if (r.samples && r.samples.length > 0 && inspectedRequests.length === 0) {
        const inspTbody = document.getElementById('requestInspectorBody');
        inspTbody.innerHTML = '';
        r.samples.forEach(s => {
          const sampleMetric = {
            method: s.method,
            url: s.url,
            status_code: s.status_code,
            latency_ms: (s.latency / 1000000),
            success: s.passed,
            scenario_name: s.scenario_name,
            request_name: s.request_name,
            request_headers: s.request_headers,
            request_body: s.request_body,
            response_headers: s.response_headers,
            response_body: s.response_body,
            assertions: s.assertions,
            error: s.error
          };
          inspectedRequests.push(sampleMetric);
          renderInspectorRow(sampleMetric);
        });
      }
    }

    function appendLog(line) {
      const consoleEl = document.getElementById('logConsole');
      const p = document.createElement('div');
      p.innerText = line;
      consoleEl.appendChild(p);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function runAgain() {
      vscode.postMessage({ command: 'runAgain' });
    }

    function stopTest() {
      vscode.postMessage({ command: 'stopTest' });
    }

    function analyzeWithAI() {
      vscode.postMessage({ command: 'analyzeWithAI' });
    }

    // Modal Inspector Functions
    function openModal(m) {
      const method = m.method || 'GET';
      const methodEl = document.getElementById('modalMethod');
      methodEl.innerText = method;
      methodEl.className = 'badge-method method-' + method;

      document.getElementById('modalUrl').innerText = m.url || m.request_name || '';
      
      const statusEl = document.getElementById('modalStatus');
      statusEl.innerText = (m.status_code || 0) + (m.success ? ' OK' : ' FAIL');
      statusEl.className = 'badge-status ' + ((m.status_code >= 200 && m.status_code < 400 && m.success) ? 'badge-2xx' : 'badge-err');

      document.getElementById('modalLatency').innerText = (m.latency_ms != null ? m.latency_ms.toFixed(1) : '0') + 'ms';

      // Request Headers
      const reqHBody = document.getElementById('modalReqHeaders');
      reqHBody.innerHTML = '';
      if (m.request_headers && Object.keys(m.request_headers).length > 0) {
        Object.entries(m.request_headers).forEach(([k, v]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td style="color: var(--primary);">' + k + '</td><td>' + v + '</td>';
          reqHBody.appendChild(tr);
        });
      } else {
        reqHBody.innerHTML = '<tr><td colspan="2" style="color: var(--muted);">No custom request headers</td></tr>';
      }

      // Request Body
      document.getElementById('modalReqBody').innerText = m.request_body || '(No request body)';

      // Response Headers
      const respHBody = document.getElementById('modalRespHeaders');
      respHBody.innerHTML = '';
      if (m.response_headers && Object.keys(m.response_headers).length > 0) {
        Object.entries(m.response_headers).forEach(([k, v]) => {
          const tr = document.createElement('tr');
          tr.innerHTML = '<td style="color: var(--primary);">' + k + '</td><td>' + v + '</td>';
          respHBody.appendChild(tr);
        });
      } else {
        respHBody.innerHTML = '<tr><td colspan="2" style="color: var(--muted);">No response headers captured</td></tr>';
      }

      // Response Body (pretty print if JSON)
      let formattedResp = m.response_body || (m.error ? 'Error: ' + m.error : '(Empty response)');
      try {
        const parsed = JSON.parse(formattedResp);
        formattedResp = JSON.stringify(parsed, null, 2);
      } catch {}
      document.getElementById('modalRespBody').innerText = formattedResp;

      // Assertions
      const assertContainer = document.getElementById('modalAssertions');
      assertContainer.innerHTML = '';
      if (m.assertions && m.assertions.length > 0) {
        m.assertions.forEach(msg => {
          const isPass = msg.includes('[PASS]');
          const div = document.createElement('div');
          div.className = 'assertion-item ' + (isPass ? 'assertion-pass' : 'assertion-fail');
          div.innerHTML = '<span>' + (isPass ? '✓' : '✗') + '</span> <span>' + msg + '</span>';
          assertContainer.appendChild(div);
        });
      } else {
        assertContainer.innerHTML = '<div style="color: var(--muted);">No explicit assertions defined (Status 2xx implied: ' + (m.success ? 'PASS' : 'FAIL') + ')</div>';
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
</html>`;
  }
}
