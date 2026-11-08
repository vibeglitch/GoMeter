import * as vscode from 'vscode';
import { LiveMetricPayload, GoMeterBridge } from '../services/gometerBridge';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _bridge?: GoMeterBridge;
  private _disposables: vscode.Disposable[] = [];
  private static _latestReport?: any;
  private static _latestStatus: string = 'Ready';

  public static createOrShow(extensionUri: vscode.Uri, bridge?: GoMeterBridge) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      if (bridge) {
        DashboardPanel.currentPanel._bridge = bridge;
        DashboardPanel.currentPanel.sendHistory(bridge.getRunHistory());
      }
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

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, bridge);
    return DashboardPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, bridge?: GoMeterBridge) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._bridge = bridge;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'ready':
            this.sendStatus(DashboardPanel._latestStatus);
            if (DashboardPanel._latestReport) {
              this.sendReport(DashboardPanel._latestReport);
            }
            if (this._bridge) {
              this.sendHistory(this._bridge.getRunHistory());
            }
            break;
          case 'analyzeWithAI':
            vscode.commands.executeCommand('gometer.analyzeReportWithAI');
            break;
          case 'runAgain':
            vscode.commands.executeCommand('gometer.runActiveTest');
            break;
          case 'stopTest':
            vscode.commands.executeCommand('gometer.stopActiveTest');
            break;
          case 'getHistory':
            if (this._bridge) {
              this.sendHistory(this._bridge.getRunHistory());
            }
            break;
          case 'loadRun':
            if (this._bridge && message.runId) {
              const rep = this._bridge.getReport(message.runId);
              if (rep) {
                this.sendReport(rep);
              } else {
                vscode.window.showWarningMessage(`Could not find report for run: ${message.runId}`);
              }
            }
            break;
        }
      },
      null,
      this._disposables
    );

    if (this._bridge) {
      setTimeout(() => {
        if (this._bridge) {
          this.sendHistory(this._bridge.getRunHistory());
        }
      }, 300);
    }
  }

  public sendLiveMetric(metric: LiveMetricPayload) {
    this._panel.webview.postMessage({ type: 'metric', data: metric });
  }

  public sendReport(report: any) {
    DashboardPanel._latestReport = report;
    this._panel.webview.postMessage({ type: 'report', data: report });
  }

  public sendHistory(history: any[]) {
    this._panel.webview.postMessage({ type: 'history', data: history });
  }

  public sendStatus(status: string) {
    DashboardPanel._latestStatus = status;
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GoMeter Live Dashboard</title>
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
      --method-patch: #a855f7;
      --method-delete: #ef4444;
      --method-head: #0ea5e9;
      --method-options: #94a3b8;
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
      flex-wrap: wrap;
      gap: 12px;
    }
    .title-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .brand { font-size: 22px; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 6px; }
    .status-badge {
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.2);
      color: var(--primary);
    }
    /* Modern Run Selector Dropdown */
    .run-dropdown-wrapper {
      position: relative;
      display: inline-block;
    }
    .run-dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 14px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      font-size: 13px;
      color: var(--text);
    }
    .run-dropdown-trigger:hover {
      border-color: var(--primary);
      background: var(--card-hover);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .run-dropdown-trigger.active {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
    }
    .run-dropdown-prefix {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 700;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .run-dropdown-current {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 600;
      color: var(--text);
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      display: inline-block;
      flex-shrink: 0;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .chevron-icon {
      margin-left: 3px;
      color: var(--muted);
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }
    .run-dropdown-trigger.active .chevron-icon {
      transform: rotate(180deg);
      color: var(--primary);
    }

    /* Floating Popover Menu */
    .run-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      min-width: 380px;
      max-width: 480px;
      max-height: 420px;
      background: #182234;
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      z-index: 1000;
      overflow-y: auto;
      display: none;
      padding: 8px;
      backdrop-filter: blur(8px);
      animation: dropdownFadeIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .run-dropdown-menu.show {
      display: block;
    }
    .run-dropdown-header {
      padding: 6px 10px 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      margin-bottom: 6px;
    }
    .run-dropdown-header span {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--muted);
    }
    .run-dropdown-header .count-badge {
      font-size: 11px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .run-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 3px;
      border: 1px solid transparent;
    }
    .run-item:hover {
      background: var(--card-hover);
      border-color: rgba(56, 189, 248, 0.2);
    }
    .run-item.selected {
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .run-item-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }
    .run-item-status-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .run-item-status-pass {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }
    .run-item-status-fail {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    .run-item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .run-item-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .run-item-subtitle {
      font-size: 11px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .run-item-metrics {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    .run-item-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
    }
    .run-item-rps {
      font-size: 11px;
      color: var(--primary);
      font-weight: 500;
    }
    .run-dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.07);
      margin: 6px 4px;
    }
    .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
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
    /* SLA Quality Gates Panel */
    .thresholds-panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
      transition: all 0.2s ease;
    }
    .thresholds-panel.breached {
      border-color: rgba(239, 68, 68, 0.5);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--card) 100%);
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.1);
    }
    .thresholds-panel.passed {
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(180deg, rgba(34, 197, 94, 0.06) 0%, var(--card) 100%);
    }
    .thresholds-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    }
    .thresholds-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .thresholds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
    }
    .threshold-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .threshold-card.pass {
      border-color: rgba(34, 197, 94, 0.35);
    }
    .threshold-card.fail {
      border-color: rgba(239, 68, 68, 0.45);
      background: rgba(239, 68, 68, 0.08);
    }
    .threshold-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .threshold-name {
      font-weight: 700;
      font-size: 13px;
      color: var(--text);
      text-transform: capitalize;
    }
    .threshold-condition {
      font-size: 11px;
      color: var(--muted);
    }
    .threshold-value {
      font-size: 13px;
      font-weight: 700;
    }
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
      height: 220px;
      display: flex;
      flex-direction: column;
    }
    .chart-wrapper {
      flex: 1;
      width: 100%;
      position: relative;
      min-height: 160px;
    }
    canvas#liveLatencyChart {
      width: 100%;
      height: 100%;
      display: block;
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
    .method-PATCH { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    .method-DELETE { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .method-HEAD { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
    .method-OPTIONS { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
    
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
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(2px);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal {
      background: #1e293b;
      border: 1px solid var(--border);
      border-radius: 12px;
      width: 90%;
      max-width: 720px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #182234;
    }
    .modal-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .modal-close {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
    }
    .modal-close:hover { color: var(--text); }
    .modal-tabs {
      display: flex;
      background: #0f172a;
      border-bottom: 1px solid var(--border);
    }
    .modal-tab {
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .modal-tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      background: #1e293b;
    }
    .modal-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
    }
    .section-subtitle {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      margin: 12px 0 6px 0;
    }
    .code-block {
      background: #020617;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 200px;
      overflow-y: auto;
      color: #e2e8f0;
    }
    .kv-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .kv-table td, .kv-table th {
      padding: 6px 8px;
      border: 1px solid var(--border);
    }
    .kv-table th { background: #0f172a; color: var(--muted); }
    .assertion-item {
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
      font-size: 12px;
      font-family: monospace;
      display: flex;
      align-items: center;
      gap: 8px;
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
      <div class="run-dropdown-wrapper">
        <button id="runDropdownBtn" class="run-dropdown-trigger" onclick="toggleRunDropdown(event)" type="button" aria-haspopup="listbox" aria-expanded="false">
          <span class="run-dropdown-prefix">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Run:
          </span>
          <span id="selectedRunDisplay" class="run-dropdown-current">
            <span class="pulse-dot"></span> Current / Live Test
          </span>
          <svg class="chevron-icon" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>

        <!-- Floating Popover Menu -->
        <div id="runDropdownMenu" class="run-dropdown-menu" role="listbox">
          <div class="run-dropdown-header">
            <span>Execution Runs</span>
            <span id="runsCountBadge" class="count-badge">Live</span>
          </div>
          <!-- Live Run Option -->
          <div id="runItemLive" class="run-item selected" onclick="selectCustomRun('live')">
            <div class="run-item-left">
              <span class="pulse-dot"></span>
              <div class="run-item-details">
                <div class="run-item-title">Current / Live Test</div>
                <div class="run-item-subtitle">Real-time metrics stream &amp; active telemetry</div>
              </div>
            </div>
            <div class="run-item-metrics">
              <span class="run-item-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700;">LIVE</span>
            </div>
          </div>
          <div class="run-dropdown-divider"></div>
          <div id="historicalRunsList">
            <div style="padding: 12px; text-align: center; color: var(--muted); font-size: 12px;">No past runs yet</div>
          </div>
        </div>

        <!-- Hidden native select kept for full backward compatibility -->
        <select id="historySelect" style="display: none;" onchange="onSelectRun(this.value)">
          <option value="live">● Current / Live Test</option>
        </select>
      </div>
    </div>
    <div class="actions">
      <button id="btnStop" class="btn-danger" style="display: none;" onclick="stopTest()">⏹ Stop Test</button>
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
      <div id="valAvgLatency" class="card-val">0.0ms</div>
    </div>
    <div class="card">
      <div class="card-label">p95 Latency</div>
      <div id="valP95" class="card-val">0.0ms</div>
    </div>
  </div>

  <!-- SLA Quality Gates & Thresholds Panel -->
  <div id="thresholdsPanel" class="thresholds-panel" style="display: none;">
    <div class="thresholds-header">
      <div class="thresholds-title">
        <span id="thresholdStatusIcon" style="font-size: 16px;">⚖️</span>
        <span style="font-weight: 700; font-size: 14px;">SLA Thresholds &amp; Quality Gates</span>
      </div>
      <div id="thresholdSummaryBadge" class="badge-status">0 / 0 Evaluated</div>
    </div>
    <div id="thresholdsList" class="thresholds-grid"></div>
  </div>

  <div class="charts">
    <div class="chart-box">
      <div class="card-label">Real-Time Response Latency Timeline (ms)</div>
      <div class="chart-wrapper">
        <canvas id="liveLatencyChart"></canvas>
      </div>
    </div>
  </div>

  <!-- Endpoint Breakdown Table -->
  <div class="table-box">
    <div class="table-title">Endpoint Aggregation Summary</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Request / Name</th>
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

  <!-- Run History Section -->
  <div class="table-box">
    <div class="table-title">
      <span>📜 Run History & Past Benchmarks</span>
      <button class="btn-secondary" style="padding: 3px 8px; font-size: 12px;" onclick="refreshHistory()">🔄 Refresh History</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Test Name</th>
            <th>Total Reqs</th>
            <th>Throughput</th>
            <th>p95 Latency</th>
            <th>Error Rate</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="historyTableBody">
          <tr><td colspan="8" style="text-align:center; color: var(--muted); padding: 18px;">No historical runs recorded yet</td></tr>
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

    // 1. Immediately register message listener at the very top of script
    window.addEventListener('message', event => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'metric') {
        handleMetric(msg.data);
      } else if (msg.type === 'report') {
        handleFinalReport(msg.data);
      } else if (msg.type === 'status') {
        updateStatus(msg.data);
      } else if (msg.type === 'log') {
        appendLog(msg.data);
      } else if (msg.type === 'history') {
        handleHistory(msg.data);
      }
    });

    // Notify extension that webview is mounted and ready for data
    vscode.postMessage({ command: 'ready' });

    let totalCount = 0;
    let successCount = 0;
    let failCount = 0;
    let totalLatencySum = 0;
    let allLatencies = [];
    let testStartTime = null;
    let liveEndpoints = {};
    const maxDataPoints = 40;
    const latencyHistory = [];
    const inspectedRequests = [];
    let runHistoryList = [];

    // Native HTML5 Canvas Line Chart (Dependency-free & 100% Offline-Safe)
    function renderNativeLatencyChart() {
      const canvas = document.getElementById('liveLatencyChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 30; y < h - 15; y += 38) {
        ctx.moveTo(35, y);
        ctx.lineTo(w - 10, y);
      }
      ctx.stroke();

      if (latencyHistory.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('Awaiting latency metrics...', 40, h / 2);
        return;
      }

      const maxVal = Math.max(10, ...latencyHistory) * 1.15;

      // Y-axis labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(maxVal.toFixed(0) + 'ms', 4, 30);
      ctx.fillText((maxVal / 2).toFixed(0) + 'ms', 4, h / 2);
      ctx.fillText('0ms', 12, h - 18);

      const startX = 40;
      const plotW = w - startX - 10;
      const stepX = latencyHistory.length > 1 ? plotW / (latencyHistory.length - 1) : plotW;

      // Gradient Fill
      ctx.beginPath();
      latencyHistory.forEach((val, i) => {
        const x = startX + i * stepX;
        const y = h - 20 - (val / maxVal) * (h - 45);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      const lastX = startX + (latencyHistory.length - 1) * stepX;
      ctx.lineTo(lastX, h - 20);
      ctx.lineTo(startX, h - 20);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line Stroke
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      latencyHistory.forEach((val, i) => {
        const x = startX + i * stepX;
        const y = h - 20 - (val / maxVal) * (h - 45);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Data Points
      ctx.fillStyle = '#38bdf8';
      latencyHistory.forEach((val, i) => {
        const x = startX + i * stepX;
        const y = h - 20 - (val / maxVal) * (h - 45);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    window.addEventListener('resize', () => {
      renderNativeLatencyChart();
    });

    function resetLiveMetrics() {
      totalCount = 0;
      successCount = 0;
      failCount = 0;
      totalLatencySum = 0;
      allLatencies = [];
      testStartTime = Date.now();
      liveEndpoints = {};
      latencyHistory.length = 0;
      inspectedRequests.length = 0;
      const thPanel = document.getElementById('thresholdsPanel');
      if (thPanel) thPanel.style.display = 'none';
      document.getElementById('valTotal').innerText = '0';
      document.getElementById('valRPS').innerText = '0.0';
      document.getElementById('valSuccessRate').innerText = '100%';
      document.getElementById('valAvgLatency').innerText = '0.0ms';
      document.getElementById('valP95').innerText = '0.0ms';
      document.getElementById('inspectorCounter').innerText = '0 inspected';
      document.getElementById('requestInspectorBody').innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--muted); padding: 18px;">Awaiting live requests...</td></tr>';
      document.getElementById('endpointTableBody').innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--muted); padding: 18px;">Awaiting endpoint stats...</td></tr>';
      renderNativeLatencyChart();
    }

    let currentStatus = 'Ready';

    function updateStatus(status) {
      currentStatus = status;
      const badge = document.getElementById('statusBadge');
      badge.innerText = status;
      const btnStop = document.getElementById('btnStop');
      if (status === 'RUNNING') {
        resetLiveMetrics();
        badge.style.background = 'rgba(56, 189, 248, 0.2)';
        badge.style.color = '#38bdf8';
        btnStop.style.display = 'inline-flex';
        btnStop.disabled = false;
        btnStop.innerText = '⏹ Stop Test';
      } else if (status === 'STOPPED') {
        badge.style.background = 'rgba(245, 158, 11, 0.2)';
        badge.style.color = '#f59e0b';
        btnStop.style.display = 'none';
      } else if (status === 'PASSED') {
        badge.style.background = 'rgba(34, 197, 94, 0.2)';
        badge.style.color = '#22c55e';
        btnStop.style.display = 'none';
      } else if (status === 'FAILED') {
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#ef4444';
        btnStop.style.display = 'none';
      } else {
        btnStop.style.display = 'none';
      }
    }

    function calculateP95(arr) {
      if (!arr || arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      return sorted[idx];
    }

    function formatLatency(val) {
      if (val === undefined || val === null) return '0.0ms';
      const num = Number(val);
      if (isNaN(num)) return String(val);
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'ms';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'ms';
      }
      return num.toFixed(1) + 'ms';
    }

    function handleMetric(m) {
      if (!testStartTime) {
        testStartTime = Date.now();
      }
      totalCount++;
      if (m.success) { successCount++; } else { failCount++; }
      const lat = m.latency_ms || 0;
      totalLatencySum += lat;
      allLatencies.push(lat);

      document.getElementById('valTotal').innerText = totalCount;
      const rate = ((successCount / totalCount) * 100).toFixed(1);
      document.getElementById('valSuccessRate').innerText = rate + '%';

      // Live Throughput (RPS)
      const elapsedSec = Math.max(0.1, (Date.now() - testStartTime) / 1000);
      document.getElementById('valRPS').innerText = (totalCount / elapsedSec).toFixed(1);

      // Live Average Latency
      document.getElementById('valAvgLatency').innerText = (totalLatencySum / totalCount).toFixed(1) + 'ms';

      // Live p95 Latency
      document.getElementById('valP95').innerText = calculateP95(allLatencies).toFixed(1) + 'ms';

      // Update native timeline chart
      latencyHistory.push(lat);
      if (latencyHistory.length > maxDataPoints) {
        latencyHistory.shift();
      }
      renderNativeLatencyChart();

      // Update live endpoint aggregation
      updateLiveEndpoint(m);

      // Append to inspected requests (up to 100)
      if (inspectedRequests.length < 100 || !m.success) {
        inspectedRequests.unshift(m);
        if (inspectedRequests.length > 100) {
          inspectedRequests.pop();
        }
        renderInspectorRow(m);
      }
    }

    function updateLiveEndpoint(m) {
      const name = m.request_name || m.url || 'Request';
      const method = m.method || 'GET';
      const key = method + ':' + name;
      if (!liveEndpoints[key]) {
        liveEndpoints[key] = {
          name: name,
          method: method,
          count: 0,
          success: 0,
          failed: 0,
          totalLat: 0,
          latencies: []
        };
      }
      const ep = liveEndpoints[key];
      ep.count++;
      if (m.success) ep.success++; else ep.failed++;
      const lat = m.latency_ms || 0;
      ep.totalLat += lat;
      ep.latencies.push(lat);

      renderEndpointTable();
    }

    function renderEndpointTable() {
      const tbody = document.getElementById('endpointTableBody');
      const keys = Object.keys(liveEndpoints);
      if (keys.length === 0) return;

      tbody.innerHTML = '';
      keys.forEach(k => {
        const ep = liveEndpoints[k];
        const successRate = ((ep.success / ep.count) * 100).toFixed(1);
        const avgLat = (ep.totalLat / ep.count).toFixed(1) + 'ms';
        const p95 = calculateP95(ep.latencies).toFixed(1) + 'ms';
        const methodCls = 'method-' + ep.method;

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><strong>\${ep.name}</strong></td>
          <td><span class="badge-method \${methodCls}">\${ep.method}</span></td>
          <td>\${ep.count}</td>
          <td>\${successRate}%</td>
          <td>\${avgLat}</td>
          <td>\${p95}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function renderInspectorRow(m) {
      const tbody = document.getElementById('requestInspectorBody');
      if (inspectedRequests.length === 1) {
        tbody.innerHTML = '';
      }

      const tr = document.createElement('tr');
      tr.className = 'clickable';
      tr.onclick = () => openModal(m);

      const statusCls = (m.status_code >= 200 && m.status_code < 400 && m.success) ? 'badge-2xx' : 'badge-err';
      const method = m.method || 'GET';
      const methodCls = 'method-' + method;
      const urlText = m.url || m.request_name || '-';
      const latencyText = (m.latency_ms != null ? m.latency_ms.toFixed(1) : '0.0') + 'ms';

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
      if (currentStatus !== 'STOPPED') {
        updateStatus(r.passed ? 'PASSED' : 'FAILED');
      }

      if (r.total_requests !== undefined) {
        document.getElementById('valTotal').innerText = r.total_requests;
      }
      if (r.requests_per_second !== undefined) {
        const rpsNum = typeof r.requests_per_second === 'number' ? r.requests_per_second.toFixed(1) : r.requests_per_second;
        document.getElementById('valRPS').innerText = rpsNum;
      }
      if (r.error_rate_percent !== undefined) {
        document.getElementById('valSuccessRate').innerText = (100 - r.error_rate_percent).toFixed(1) + '%';
      }
      if (r.avg_latency !== undefined) {
        document.getElementById('valAvgLatency').innerText = formatLatency(r.avg_latency);
      }
      if (r.p95_latency !== undefined) {
        document.getElementById('valP95').innerText = formatLatency(r.p95_latency);
      }

      // Endpoint breakdown from report scenarios
      const rows = [];
      if (r.scenarios && r.scenarios.length > 0) {
        r.scenarios.forEach(sc => {
          if (sc.requests && sc.requests.length > 0) {
            sc.requests.forEach(req => {
              rows.push({
                name: req.name || req.url,
                method: req.method || 'GET',
                count: req.count,
                successRate: (req.success_rate !== undefined ? req.success_rate.toFixed(1) : ((req.success / Math.max(1, req.count)) * 100).toFixed(1)) + '%',
                avg: formatLatency(req.avg_latency),
                p95: formatLatency(req.p95_latency)
              });
            });
          }
        });
      }

      if (rows.length > 0) {
        const tbody = document.getElementById('endpointTableBody');
        tbody.innerHTML = '';
        rows.forEach(item => {
          const tr = document.createElement('tr');
          const methodCls = 'method-' + item.method;
          tr.innerHTML = \`
            <td><strong>\${item.name}</strong></td>
            <td><span class="badge-method \${methodCls}">\${item.method}</span></td>
            <td>\${item.count}</td>
            <td>\${item.successRate}</td>
            <td>\${item.avg}</td>
            <td>\${item.p95}</td>
          \`;
          tbody.appendChild(tr);
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

      // Render SLA Thresholds & Quality Gates
      const thPanel = document.getElementById('thresholdsPanel');
      const thList = document.getElementById('thresholdsList');
      const thBadge = document.getElementById('thresholdSummaryBadge');
      const thIcon = document.getElementById('thresholdStatusIcon');

      if (thPanel && thList && r.thresholds && Array.isArray(r.thresholds) && r.thresholds.length > 0) {
        thPanel.style.display = 'block';
        thList.innerHTML = '';
        const breached = r.thresholds.filter(t => !t.passed);
        const allPassed = breached.length === 0;

        thPanel.className = 'thresholds-panel ' + (allPassed ? 'passed' : 'breached');
        if (thIcon) thIcon.innerText = allPassed ? '✅' : '⚠️';
        if (thBadge) {
          thBadge.className = 'badge-status ' + (allPassed ? 'badge-2xx' : 'badge-err');
          thBadge.innerText = allPassed
            ? (r.thresholds.length + '/' + r.thresholds.length + ' PASSED')
            : (breached.length + ' BREACHED (' + (r.thresholds.length - breached.length) + '/' + r.thresholds.length + ' PASSED)');
        }

        r.thresholds.forEach(t => {
          const card = document.createElement('div');
          card.className = 'threshold-card ' + (t.passed ? 'pass' : 'fail');
          const metricLabel = (t.metric || '').replace(/_/g, ' ');
          const actualVal = typeof t.actual === 'number' ? Number(t.actual).toFixed(1) : t.actual;
          const actualDisplay = actualVal + (t.unit || '');
          const expectedDisplay = (t.operator || '') + ' ' + t.expected + (t.unit || '');
          const valColor = t.passed ? '#4ade80' : '#f87171';
          const passTag = t.passed
            ? '<span class="badge-status badge-2xx" style="font-size:10px;">PASS</span>'
            : '<span class="badge-status badge-err" style="font-size:10px;">FAIL</span>';

          card.innerHTML =
            '<div class="threshold-info">' +
              '<div class="threshold-name">' + metricLabel + '</div>' +
              '<div class="threshold-condition">Target: ' + expectedDisplay + '</div>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
              '<div class="threshold-value" style="color:' + valColor + ';">' + actualDisplay + '</div>' +
              passTag +
            '</div>';
          thList.appendChild(card);
        });
      } else if (thPanel) {
        thPanel.style.display = 'none';
      }

      // Refresh history list so this completed run appears immediately
      vscode.postMessage({ command: 'getHistory' });
    }

    let currentSelectedRunId = 'live';

    function toggleRunDropdown(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('runDropdownMenu');
      const btn = document.getElementById('runDropdownBtn');
      if (!menu || !btn) return;
      const isOpen = menu.classList.contains('show');
      if (isOpen) {
        closeRunDropdown();
      } else {
        menu.classList.add('show');
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    function closeRunDropdown() {
      const menu = document.getElementById('runDropdownMenu');
      const btn = document.getElementById('runDropdownBtn');
      if (menu) menu.classList.remove('show');
      if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      }
    }

    window.addEventListener('click', (e) => {
      const wrapper = document.querySelector('.run-dropdown-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeRunDropdown();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeRunDropdown();
      }
    });

    function selectCustomRun(runId) {
      currentSelectedRunId = runId;
      updateSelectedRunDisplay(runId);
      closeRunDropdown();
      onSelectRun(runId);
    }

    function updateSelectedRunDisplay(runId) {
      currentSelectedRunId = runId;
      const display = document.getElementById('selectedRunDisplay');
      if (!display) return;

      if (runId === 'live') {
        display.innerHTML = '<span class="pulse-dot"></span> Current / Live Test';
      } else {
        const h = runHistoryList.find(x => x.id === runId);
        if (h) {
          const timeStr = h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : runId;
          const statusColor = h.passed ? '#4ade80' : '#f87171';
          const statusIcon = h.passed ? '✓' : '✗';
          display.innerHTML = '<span style="color: ' + statusColor + '; font-weight: 800; font-size: 13px;">' + statusIcon + '</span> <span style="font-weight: 600;">' + (h.test_name || 'Test Run') + '</span> <span style="color: var(--muted); font-size: 11px;">(' + timeStr + ')</span>';
        } else {
          display.innerHTML = '<span style="color: var(--primary);">📊 ' + runId + '</span>';
        }
      }

      // Update selected classes in dropdown list
      document.querySelectorAll('#runDropdownMenu .run-item').forEach(el => el.classList.remove('selected'));
      if (runId === 'live') {
        const liveEl = document.getElementById('runItemLive');
        if (liveEl) liveEl.classList.add('selected');
      } else {
        const itemEl = document.getElementById('runItem_' + runId);
        if (itemEl) itemEl.classList.add('selected');
      }
    }

    function handleHistory(history) {
      if (!Array.isArray(history)) return;
      runHistoryList = history;

      // Update Count Badge
      const countBadge = document.getElementById('runsCountBadge');
      if (countBadge) {
        countBadge.innerText = history.length > 0 ? (history.length + ' runs') : 'Live';
      }

      // Populate Custom Dropdown Menu
      const runsListContainer = document.getElementById('historicalRunsList');
      if (runsListContainer) {
        if (history.length === 0) {
          runsListContainer.innerHTML = '<div style="padding: 14px; text-align: center; color: var(--muted); font-size: 12px;">No historical runs recorded yet</div>';
        } else {
          runsListContainer.innerHTML = '';
          history.forEach(h => {
            const timeDisplay = h.timestamp ? new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : h.id;
            const statusCls = h.passed ? 'run-item-status-pass' : 'run-item-status-fail';
            const statusIcon = h.passed ? '✓' : '✗';
            const isSelected = h.id === currentSelectedRunId ? 'selected' : '';
            const rpsStr = h.rps !== undefined ? Number(h.rps).toFixed(1) + ' RPS' : '';
            const reqsStr = (h.total_requests || 0) + ' reqs';

            const itemDiv = document.createElement('div');
            itemDiv.id = 'runItem_' + h.id;
            itemDiv.className = 'run-item ' + isSelected;
            itemDiv.onclick = () => selectCustomRun(h.id);
            itemDiv.innerHTML =
              '<div class="run-item-left">' +
                '<div class="run-item-status-icon ' + statusCls + '">' + statusIcon + '</div>' +
                '<div class="run-item-details">' +
                  '<div class="run-item-title" title="' + (h.test_name || 'Test Plan') + '">' + (h.test_name || 'Test Plan') + '</div>' +
                  '<div class="run-item-subtitle">' + timeDisplay + ' · ' + h.id + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="run-item-metrics">' +
                '<span class="run-item-badge">' + reqsStr + '</span>' +
                (rpsStr ? '<span class="run-item-rps">' + rpsStr + '</span>' : '') +
              '</div>';
            runsListContainer.appendChild(itemDiv);
          });
        }
      }

      // Populate Run Selector dropdown
      const sel = document.getElementById('historySelect');
      const currentVal = sel.value;
      sel.innerHTML = '<option value="live">● Current / Live Test</option>';
      history.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = h.id;
        const timeStr = h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ('Run #' + (idx + 1));
        const badge = h.passed ? '✓' : '✗';
        opt.innerText = \`\${badge} \${timeStr} - \${h.test_name || 'Test'} (\${h.total_requests || 0} reqs)\`;
        sel.appendChild(opt);
      });
      if (currentVal && history.some(h => h.id === currentVal)) {
        sel.value = currentVal;
      }

      // Populate Run History table
      const tbody = document.getElementById('historyTableBody');
      if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--muted); padding: 18px;">No historical runs recorded yet</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      history.forEach(h => {
        const tr = document.createElement('tr');
        const timeDisplay = h.timestamp ? new Date(h.timestamp).toLocaleString() : h.id;
        const statusBadge = h.passed
          ? '<span class="badge-status badge-2xx">PASS</span>'
          : '<span class="badge-status badge-err">FAIL</span>';
        const rpsStr = h.rps !== undefined ? Number(h.rps).toFixed(1) + ' RPS' : '-';
        const p95Str = h.p95_latency_ms !== undefined ? Number(h.p95_latency_ms).toFixed(1) + 'ms' : '-';
        const errStr = h.error_rate !== undefined ? Number(h.error_rate).toFixed(1) + '%' : '-';

        tr.innerHTML = \`
          <td><strong>\${timeDisplay}</strong></td>
          <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${h.test_name || '-'}">\${h.test_name || '-'}</td>
          <td>\${h.total_requests || 0}</td>
          <td style="color: var(--primary);">\${rpsStr}</td>
          <td>\${p95Str}</td>
          <td>\${errStr}</td>
          <td>\${statusBadge}</td>
          <td><button class="btn-secondary" style="padding: 3px 8px; font-size: 11px;" onclick="loadRunReport('\${h.id}')">Load 📊</button></td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function onSelectRun(runId) {
      if (runId === 'live') {
        currentSelectedRunId = 'live';
        updateSelectedRunDisplay('live');
        updateStatus('Ready');
      } else {
        loadRunReport(runId);
      }
    }

    function loadRunReport(runId) {
      currentSelectedRunId = runId;
      updateSelectedRunDisplay(runId);
      const sel = document.getElementById('historySelect');
      if (sel) sel.value = runId;
      vscode.postMessage({ command: 'loadRun', runId: runId });
    }

    function refreshHistory() {
      vscode.postMessage({ command: 'getHistory' });
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
      const btnStop = document.getElementById('btnStop');
      if (btnStop) {
        btnStop.disabled = true;
        btnStop.innerText = '⏹ Stopping...';
      }
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

      document.getElementById('modalLatency').innerText = (m.latency_ms != null ? m.latency_ms.toFixed(1) : '0.0') + 'ms';

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
