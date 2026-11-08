import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { GoMeterBridge } from './gometerBridge';
import { findAllTestPlans, isGoMeterTestFile } from '../providers/testPlanTreeProvider';

export class ExportCsvService {
  constructor(private bridge: GoMeterBridge) {}

  /**
   * Exports an individual test plan YAML file to CSV.
   */
  public async exportTestPlan(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(`Test plan file not found: ${filePath}`);
      return;
    }

    try {
      const rows = this.parsePlanToRows(filePath);
      if (rows.length === 0) {
        vscode.window.showWarningMessage(`No endpoints or scenarios found in ${path.basename(filePath)}.`);
        return;
      }

      const defaultName = `${path.parse(filePath).name}.csv`;
      const defaultDir = path.dirname(filePath);
      const defaultUri = vscode.Uri.file(path.join(defaultDir, defaultName));

      const targetUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'CSV Files': ['csv'] },
        title: `Export ${path.basename(filePath)} to CSV`,
      });

      if (!targetUri) {
        return;
      }

      const csvContent = this.rowsToCsv(rows);
      fs.writeFileSync(targetUri.fsPath, csvContent, 'utf8');

      const action = await vscode.window.showInformationMessage(
        `Exported test plan to ${path.basename(targetUri.fsPath)} (${rows.length} endpoints)`,
        'Open CSV'
      );

      if (action === 'Open CSV') {
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to export test plan: ${err.message || err}`);
    }
  }

  /**
   * Recursively discovers all test plans in a folder and exports them into a combined CSV.
   */
  public async exportFolder(folderPath: string): Promise<void> {
    if (!fs.existsSync(folderPath)) {
      vscode.window.showErrorMessage(`Folder not found: ${folderPath}`);
      return;
    }

    try {
      const planFiles = findAllTestPlans(folderPath);
      if (planFiles.length === 0) {
        vscode.window.showWarningMessage(
          `No GoMeter test plan files (.gometer.yaml, .yaml) found in '${path.basename(folderPath)}'.`
        );
        return;
      }

      const allRows: Record<string, string | number>[] = [];
      for (const file of planFiles) {
        try {
          const rows = this.parsePlanToRows(file);
          allRows.push(...rows);
        } catch {
          // Continue processing other files if one fails
        }
      }

      if (allRows.length === 0) {
        vscode.window.showWarningMessage(`No endpoints or scenarios extracted from ${planFiles.length} test plans.`);
        return;
      }

      const folderName = path.basename(folderPath) || 'test-plans';
      const defaultName = `${folderName}-test-plans.csv`;
      const defaultUri = vscode.Uri.file(path.join(folderPath, defaultName));

      const targetUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'CSV Files': ['csv'] },
        title: `Export Folder '${folderName}' to CSV (${planFiles.length} test plans)`,
      });

      if (!targetUri) {
        return;
      }

      const csvContent = this.rowsToCsv(allRows);
      fs.writeFileSync(targetUri.fsPath, csvContent, 'utf8');

      const action = await vscode.window.showInformationMessage(
        `Exported ${planFiles.length} test plans (${allRows.length} endpoints) to ${path.basename(targetUri.fsPath)}`,
        'Open CSV'
      );

      if (action === 'Open CSV') {
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to export folder to CSV: ${err.message || err}`);
    }
  }

  /**
   * Parses a test plan file and matches it against historical / latest reports.
   */
  private parsePlanToRows(filePath: string): Record<string, string | number>[] {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(rawContent) as any;
    if (!doc || typeof doc !== 'object') {
      return [];
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
    const relativePath = rootPath ? path.relative(rootPath, filePath) : filePath;
    const relativeFolder = rootPath ? path.relative(rootPath, path.dirname(filePath)) : path.dirname(filePath);

    const planName = doc.name || path.basename(filePath);
    const baseUrl = doc.base_url || '';

    // Extract Variables & CSV Sources
    const varItems: string[] = [];
    if (doc.variables) {
      if (doc.variables.inline && typeof doc.variables.inline === 'object') {
        for (const [k, v] of Object.entries(doc.variables.inline)) {
          varItems.push(`${k}=${v}`);
        }
      }
      if (Array.isArray(doc.variables.csv)) {
        for (const c of doc.variables.csv) {
          varItems.push(`csv:${c.name || 'data'}(${c.file || ''})`);
        }
      }
    }
    const variablesStr = varItems.join('; ');

    // Extract Default Headers
    const defaultHeaders = doc.defaults?.headers || {};

    // Match latest or historical report for this test plan
    const report = this.findMatchingReport(planName, filePath);
    const reportStatus = report ? (report.passed ? 'PASSED' : 'FAILED') : 'NOT RUN';
    const reportTotalReqs = report?.total_requests ?? '';
    const reportSuccessRate = report ? ((100 - (report.error_rate_percent ?? 0)).toFixed(1) + '%') : '';
    const reportRps = report ? (report.requests_per_second ?? 0).toFixed(1) : '';
    const reportMinLatency = report ? this.formatLatencyNs(report.min_latency) : '';
    const reportAvgLatency = report ? this.formatLatencyNs(report.avg_latency) : '';
    const reportMaxLatency = report ? this.formatLatencyNs(report.max_latency) : '';
    const reportP90Latency = report ? this.formatLatencyNs(report.p90_latency) : '';
    const reportP95Latency = report ? this.formatLatencyNs(report.p95_latency) : '';
    const reportP99Latency = report ? this.formatLatencyNs(report.p99_latency) : '';

    const rows: Record<string, string | number>[] = [];
    const scenarios = Array.isArray(doc.scenarios) ? doc.scenarios : [];

    for (const scenario of scenarios) {
      const scenarioName = scenario.name || 'Default Scenario';
      const vus = scenario.virtual_users ?? 1;
      const duration = scenario.duration ?? '';
      const rampUp = scenario.ramp_up ?? '';
      const thinkTime = scenario.think_time ?? '';

      // Thresholds summary
      const thresholdsList: string[] = [];
      if (Array.isArray(scenario.thresholds)) {
        for (const t of scenario.thresholds) {
          thresholdsList.push(`${t.metric || ''} ${t.operator || ''} ${t.value ?? ''}${t.unit || ''}`);
        }
      }
      const thresholdsStr = thresholdsList.join('; ');

      const requests = Array.isArray(scenario.requests) ? scenario.requests : [];

      if (requests.length === 0) {
        // Output at least a scenario-level row
        rows.push({
          'Folder': relativeFolder || '.',
          'Plan File': relativePath,
          'Test Plan': planName,
          'Base URL': baseUrl,
          'Scenario': scenarioName,
          'Virtual Users': vus,
          'Duration': duration,
          'Ramp Up': rampUp,
          'Think Time': thinkTime,
          'Request Name': '',
          'Method': '',
          'Path': '',
          'Full URL': baseUrl,
          'Headers': '',
          'Assertions': '',
          'Extractors': '',
          'Thresholds': thresholdsStr,
          'Variables / CSV': variablesStr,
          'Latest Run Status': reportStatus,
          'Latest Total Reqs': reportTotalReqs,
          'Latest Success Rate': reportSuccessRate,
          'Latest RPS': reportRps,
          'Latest Min Latency': reportMinLatency,
          'Latest Avg Latency': reportAvgLatency,
          'Latest Max Latency': reportMaxLatency,
          'Latest P90 Latency': reportP90Latency,
          'Latest P95 Latency': reportP95Latency,
          'Latest P99 Latency': reportP99Latency,
          'Endpoint Reqs': '',
          'Endpoint Avg Latency': '',
          'Endpoint P95 Latency': '',
          'Endpoint Success Rate': '',
        });
        continue;
      }

      for (const req of requests) {
        const reqName = req.name || 'Request';
        const method = (req.method || 'GET').toUpperCase();
        const reqPath = req.path || '';
        const fullUrl = reqPath.startsWith('http://') || reqPath.startsWith('https://')
          ? reqPath
          : `${baseUrl.replace(/\/+$/, '')}/${reqPath.replace(/^\/+/, '')}`;

        // Merge headers
        const mergedHeaders = { ...defaultHeaders, ...(req.headers || {}) };
        const headersStr = Object.entries(mergedHeaders)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');

        // Format assertions
        const assertionsList: string[] = [];
        if (Array.isArray(req.assertions)) {
          for (const a of req.assertions) {
            if (typeof a === 'object') {
              const details = [
                a.type,
                a.path ? `path=${a.path}` : null,
                a.expected !== undefined ? `expected=${a.expected}` : null,
              ]
                .filter(Boolean)
                .join(' ');
              assertionsList.push(details);
            } else {
              assertionsList.push(String(a));
            }
          }
        }
        const assertionsStr = assertionsList.join('; ');

        // Format extractors
        const extractList: string[] = [];
        if (Array.isArray(req.extract)) {
          for (const e of req.extract) {
            extractList.push(`${e.name || 'var'}=${e.source || 'body'}(${e.path || ''})`);
          }
        }
        const extractStr = extractList.join('; ');

        // Match endpoint in report
        const epStats = this.findEndpointStats(report, scenarioName, reqName, reqPath);

        rows.push({
          'Folder': relativeFolder || '.',
          'Plan File': relativePath,
          'Test Plan': planName,
          'Base URL': baseUrl,
          'Scenario': scenarioName,
          'Virtual Users': vus,
          'Duration': duration,
          'Ramp Up': rampUp,
          'Think Time': thinkTime,
          'Request Name': reqName,
          'Method': method,
          'Path': reqPath,
          'Full URL': fullUrl,
          'Headers': headersStr,
          'Assertions': assertionsStr,
          'Extractors': extractStr,
          'Thresholds': thresholdsStr,
          'Variables / CSV': variablesStr,
          'Latest Run Status': reportStatus,
          'Latest Total Reqs': reportTotalReqs,
          'Latest Success Rate': reportSuccessRate,
          'Latest RPS': reportRps,
          'Latest Min Latency': reportMinLatency,
          'Latest Avg Latency': reportAvgLatency,
          'Latest Max Latency': reportMaxLatency,
          'Latest P90 Latency': reportP90Latency,
          'Latest P95 Latency': reportP95Latency,
          'Latest P99 Latency': reportP99Latency,
          'Endpoint Reqs': epStats ? epStats.count : '',
          'Endpoint Avg Latency': epStats ? this.formatLatencyNs(epStats.avg_latency) : '',
          'Endpoint P95 Latency': epStats ? this.formatLatencyNs(epStats.p95_latency) : '',
          'Endpoint Success Rate': epStats ? `${epStats.success_rate.toFixed(1)}%` : '',
        });
      }
    }

    return rows;
  }

  /**
   * Finds matching report from latest.json or reports/history/
   */
  private findMatchingReport(planName: string, filePath: string): any | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '.';
    const reportsDir = path.join(rootPath, 'reports');

    // 1. Check latest.json
    const latestPath = path.join(reportsDir, 'latest.json');
    if (fs.existsSync(latestPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        if (
          report.test_name === planName ||
          report.test_name === path.basename(filePath) ||
          report.test_name === path.parse(filePath).name
        ) {
          return report;
        }
      } catch {
        // Continue
      }
    }

    // 2. Check history index
    const historyIndex = path.join(reportsDir, 'history', 'index.json');
    if (fs.existsSync(historyIndex)) {
      try {
        const list = JSON.parse(fs.readFileSync(historyIndex, 'utf8'));
        if (Array.isArray(list)) {
          const match = list.find(
            (item: any) =>
              item.test_name === planName ||
              item.test_name === path.basename(filePath) ||
              item.test_name === path.parse(filePath).name
          );
          if (match && match.id) {
            const reportFile = path.join(reportsDir, 'history', `${match.id}.json`);
            if (fs.existsSync(reportFile)) {
              return JSON.parse(fs.readFileSync(reportFile, 'utf8'));
            }
          }
        }
      } catch {
        // Continue
      }
    }

    return null;
  }

  /**
   * Finds endpoint statistics within a report's scenario requests.
   */
  private findEndpointStats(report: any, scenarioName: string, reqName: string, reqPath: string): any | null {
    if (!report || !Array.isArray(report.scenarios)) {
      return null;
    }

    for (const sc of report.scenarios) {
      if (sc.name && sc.name !== scenarioName && report.scenarios.length > 1) {
        continue;
      }
      if (Array.isArray(sc.requests)) {
        for (const r of sc.requests) {
          if (r.name === reqName || r.url === reqPath) {
            return r;
          }
        }
      }
    }

    return null;
  }

  /**
   * Formats nanoseconds into readable ms string.
   */
  private formatLatencyNs(ns: number | undefined): string {
    if (ns === undefined || ns === null || isNaN(ns)) {
      return '';
    }
    const ms = ns / 1e6;
    if (ms >= 100) {
      return `${ms.toFixed(0)}ms`;
    }
    if (ms >= 10) {
      return `${ms.toFixed(1)}ms`;
    }
    return `${ms.toFixed(2)}ms`;
  }

  /**
   * Converts an array of objects to RFC 4180 CSV string with proper quoting and escaping.
   */
  private rowsToCsv(rows: Record<string, string | number>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);

    const headerLine = headers.map((h) => this.escapeCsvValue(h)).join(',');
    const dataLines = rows.map((row) =>
      headers.map((h) => this.escapeCsvValue(row[h])).join(',')
    );

    return [headerLine, ...dataLines].join('\r\n') + '\r\n';
  }

  /**
   * RFC 4180 CSV value escaper.
   */
  private escapeCsvValue(val: any): string {
    if (val === undefined || val === null) {
      return '';
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
