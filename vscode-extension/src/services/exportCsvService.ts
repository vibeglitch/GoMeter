import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { GoMeterBridge } from './gometerBridge';
import { findAllTestPlans } from '../providers/testPlanTreeProvider';

export class ExportCsvService {
  constructor(private bridge: GoMeterBridge) {}

  /**
   * Exports an individual test plan's test results to CSV.
   */
  public async exportTestPlan(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(`Test plan file not found: ${filePath}`);
      return;
    }

    try {
      const planName = this.extractPlanName(filePath);
      const report = this.findMatchingReport(planName, filePath);

      if (!report) {
        const choice = await vscode.window.showInformationMessage(
          `No test results found for '${path.basename(filePath)}'. Would you like to run the test now to generate results?`,
          'Run Test Now',
          'Cancel'
        );
        if (choice === 'Run Test Now') {
          await vscode.commands.executeCommand('gometer.runTestFile', { filePath });
        }
        return;
      }

      const rows = this.buildTestResultRows(filePath, report);
      if (rows.length === 0) {
        vscode.window.showWarningMessage(`No execution records found in test results for ${path.basename(filePath)}.`);
        return;
      }

      const defaultName = `${path.parse(filePath).name}-test-results.csv`;
      const defaultDir = path.dirname(filePath);
      const defaultUri = vscode.Uri.file(path.join(defaultDir, defaultName));

      const targetUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'CSV Files': ['csv'] },
        title: `Export Test Results: ${path.basename(filePath)}`,
      });

      if (!targetUri) {
        return;
      }

      const csvContent = this.rowsToCsv(rows);
      fs.writeFileSync(targetUri.fsPath, csvContent, 'utf8');

      const action = await vscode.window.showInformationMessage(
        `Exported test results for ${report.test_name || path.basename(filePath)} (${rows.length} endpoints)`,
        'Open CSV'
      );

      if (action === 'Open CSV') {
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to export test results: ${err.message || err}`);
    }
  }

  /**
   * Recursively discovers all test plans in a folder and exports their test results into a combined CSV.
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
          `No test plan files (.tensilix.yaml, .gometer.yaml, .yaml) found in '${path.basename(folderPath)}'.`
        );
        return;
      }

      const allRows: Record<string, string | number>[] = [];
      let executedPlansCount = 0;

      for (const file of planFiles) {
        const planName = this.extractPlanName(file);
        const report = this.findMatchingReport(planName, file);
        if (report) {
          executedPlansCount++;
          const rows = this.buildTestResultRows(file, report);
          allRows.push(...rows);
        }
      }

      if (allRows.length === 0) {
        vscode.window.showWarningMessage(
          `No test results found for any test plans in '${path.basename(folderPath)}'. Run tests first to generate results.`
        );
        return;
      }

      const folderName = path.basename(folderPath) || 'test-plans';
      const defaultName = `${folderName}-test-results.csv`;
      const defaultUri = vscode.Uri.file(path.join(folderPath, defaultName));

      const targetUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { 'CSV Files': ['csv'] },
        title: `Export Folder Test Results: '${folderName}' (${executedPlansCount} executed plans)`,
      });

      if (!targetUri) {
        return;
      }

      const csvContent = this.rowsToCsv(allRows);
      fs.writeFileSync(targetUri.fsPath, csvContent, 'utf8');

      const action = await vscode.window.showInformationMessage(
        `Exported test results for ${executedPlansCount} test plans (${allRows.length} endpoints) to ${path.basename(targetUri.fsPath)}`,
        'Open CSV'
      );

      if (action === 'Open CSV') {
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to export folder test results: ${err.message || err}`);
    }
  }

  /**
   * Helper to extract the plan name from a YAML file.
   */
  private extractPlanName(filePath: string): string {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const doc = yaml.load(raw) as any;
      if (doc && typeof doc === 'object' && doc.name) {
        return doc.name;
      }
    } catch {}
    return path.basename(filePath);
  }

  /**
   * Builds structured test result rows from an execution report.
   */
  private buildTestResultRows(filePath: string, report: any): Record<string, string | number>[] {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
    const relativePath = rootPath ? path.relative(rootPath, filePath) : filePath;
    const relativeFolder = rootPath ? path.relative(rootPath, path.dirname(filePath)) : path.dirname(filePath);

    const testName = report.test_name || path.basename(filePath);
    const runId = report.id || 'latest';
    const timestamp = report.start_time || report.timestamp || '';
    const status = report.passed !== false ? 'PASSED' : 'FAILED';
    const durationSec = report.duration
      ? (typeof report.duration === 'number' ? (report.duration / 1e9).toFixed(2) : String(report.duration))
      : '';
    const totalRequests = report.total_requests ?? 0;
    const successRequests = report.success_requests ?? (totalRequests - (report.failed_requests ?? 0));
    const failedRequests = report.failed_requests ?? 0;
    const errorRatePct = typeof report.error_rate_percent === 'number'
      ? `${report.error_rate_percent.toFixed(2)}%`
      : (typeof report.error_rate === 'number' ? `${report.error_rate.toFixed(2)}%` : '0%');
    const successRatePct = typeof report.error_rate_percent === 'number'
      ? `${(100 - report.error_rate_percent).toFixed(2)}%`
      : (typeof report.error_rate === 'number' ? `${(100 - report.error_rate).toFixed(2)}%` : '100%');
    const rps = typeof report.requests_per_second === 'number'
      ? report.requests_per_second.toFixed(2)
      : (typeof report.rps === 'number' ? report.rps.toFixed(2) : '0');

    const minLatency = this.formatLatencyMs(report.min_latency);
    const avgLatency = this.formatLatencyMs(report.avg_latency);
    const maxLatency = this.formatLatencyMs(report.max_latency);
    const p50Latency = this.formatLatencyMs(report.p50_latency);
    const p90Latency = this.formatLatencyMs(report.p90_latency);
    const p95Latency = this.formatLatencyMs(report.p95_latency ?? (report.p95_latency_ms !== undefined ? report.p95_latency_ms * 1e6 : undefined));
    const p99Latency = this.formatLatencyMs(report.p99_latency);

    // Format SLA threshold statuses if available
    const thresholdList: string[] = [];
    if (Array.isArray(report.thresholds)) {
      for (const t of report.thresholds) {
        const passLabel = t.passed ? 'PASSED' : 'BREACHED';
        thresholdList.push(`${t.metric || 'metric'} ${t.operator || ''} ${t.expected ?? ''}${t.unit || ''} [${passLabel}]`);
      }
    }
    const thresholdsSummary = thresholdList.join('; ');

    const rows: Record<string, string | number>[] = [];
    const scenarios = Array.isArray(report.scenarios) ? report.scenarios : [];

    if (scenarios.length === 0) {
      rows.push({
        'Test Name': testName,
        'Plan File': relativePath,
        'Folder': relativeFolder || '.',
        'Run ID': runId,
        'Timestamp': timestamp,
        'Overall Status': status,
        'Duration (s)': durationSec,
        'Total Requests': totalRequests,
        'Success Requests': successRequests,
        'Failed Requests': failedRequests,
        'Success Rate': successRatePct,
        'Error Rate': errorRatePct,
        'Throughput (RPS)': rps,
        'Min Latency (ms)': minLatency,
        'Avg Latency (ms)': avgLatency,
        'Max Latency (ms)': maxLatency,
        'P50 Latency (ms)': p50Latency,
        'P90 Latency (ms)': p90Latency,
        'P95 Latency (ms)': p95Latency,
        'P99 Latency (ms)': p99Latency,
        'Scenario': 'Overall',
        'Endpoint Name': 'Overall',
        'Method': '',
        'Endpoint URL': '',
        'Endpoint Total Reqs': totalRequests,
        'Endpoint Success': successRequests,
        'Endpoint Failed': failedRequests,
        'Endpoint Success Rate': successRatePct,
        'Endpoint Avg Latency (ms)': avgLatency,
        'Endpoint Min Latency (ms)': minLatency,
        'Endpoint Max Latency (ms)': maxLatency,
        'Endpoint P95 Latency (ms)': p95Latency,
        'Endpoint P99 Latency (ms)': p99Latency,
        'Thresholds / SLA': thresholdsSummary,
      });
      return rows;
    }

    for (const sc of scenarios) {
      const scenarioName = sc.name || 'Scenario';
      const requests = Array.isArray(sc.requests) ? sc.requests : [];

      if (requests.length === 0) {
        rows.push({
          'Test Name': testName,
          'Plan File': relativePath,
          'Folder': relativeFolder || '.',
          'Run ID': runId,
          'Timestamp': timestamp,
          'Overall Status': status,
          'Duration (s)': durationSec,
          'Total Requests': totalRequests,
          'Success Requests': successRequests,
          'Failed Requests': failedRequests,
          'Success Rate': successRatePct,
          'Error Rate': errorRatePct,
          'Throughput (RPS)': rps,
          'Min Latency (ms)': minLatency,
          'Avg Latency (ms)': avgLatency,
          'Max Latency (ms)': maxLatency,
          'P50 Latency (ms)': p50Latency,
          'P90 Latency (ms)': p90Latency,
          'P95 Latency (ms)': p95Latency,
          'P99 Latency (ms)': p99Latency,
          'Scenario': scenarioName,
          'Endpoint Name': scenarioName,
          'Method': '',
          'Endpoint URL': '',
          'Endpoint Total Reqs': sc.total_requests ?? 0,
          'Endpoint Success': sc.success_requests ?? 0,
          'Endpoint Failed': sc.failed_requests ?? 0,
          'Endpoint Success Rate': sc.total_requests ? `${(((sc.success_requests ?? 0) / sc.total_requests) * 100).toFixed(2)}%` : '',
          'Endpoint Avg Latency (ms)': this.formatLatencyMs(sc.avg_latency),
          'Endpoint Min Latency (ms)': this.formatLatencyMs(sc.min_latency),
          'Endpoint Max Latency (ms)': this.formatLatencyMs(sc.max_latency),
          'Endpoint P95 Latency (ms)': this.formatLatencyMs(sc.p95_latency),
          'Endpoint P99 Latency (ms)': this.formatLatencyMs(sc.p99_latency),
          'Thresholds / SLA': thresholdsSummary,
        });
        continue;
      }

      for (const req of requests) {
        const reqName = req.name || 'Request';
        const method = (req.method || 'GET').toUpperCase();
        const url = req.url || '';
        const count = req.count ?? 0;
        const reqSuccess = req.success ?? 0;
        const reqFailed = req.failed ?? 0;
        const reqSuccessRate = typeof req.success_rate === 'number'
          ? `${req.success_rate.toFixed(2)}%`
          : (count > 0 ? `${((reqSuccess / count) * 100).toFixed(2)}%` : '100%');

        rows.push({
          'Test Name': testName,
          'Plan File': relativePath,
          'Folder': relativeFolder || '.',
          'Run ID': runId,
          'Timestamp': timestamp,
          'Overall Status': status,
          'Duration (s)': durationSec,
          'Total Requests': totalRequests,
          'Success Requests': successRequests,
          'Failed Requests': failedRequests,
          'Success Rate': successRatePct,
          'Error Rate': errorRatePct,
          'Throughput (RPS)': rps,
          'Min Latency (ms)': minLatency,
          'Avg Latency (ms)': avgLatency,
          'Max Latency (ms)': maxLatency,
          'P50 Latency (ms)': p50Latency,
          'P90 Latency (ms)': p90Latency,
          'P95 Latency (ms)': p95Latency,
          'P99 Latency (ms)': p99Latency,
          'Scenario': scenarioName,
          'Endpoint Name': reqName,
          'Method': method,
          'Endpoint URL': url,
          'Endpoint Total Reqs': count,
          'Endpoint Success': reqSuccess,
          'Endpoint Failed': reqFailed,
          'Endpoint Success Rate': reqSuccessRate,
          'Endpoint Avg Latency (ms)': this.formatLatencyMs(req.avg_latency),
          'Endpoint Min Latency (ms)': this.formatLatencyMs(req.min_latency),
          'Endpoint Max Latency (ms)': this.formatLatencyMs(req.max_latency),
          'Endpoint P95 Latency (ms)': this.formatLatencyMs(req.p95_latency),
          'Endpoint P99 Latency (ms)': this.formatLatencyMs(req.p99_latency),
          'Thresholds / SLA': thresholdsSummary,
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
      } catch {}
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
          if (match) return match;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Formats latency in nanoseconds to milliseconds string.
   */
  private formatLatencyMs(ns: number | undefined): string {
    if (ns === undefined || ns === null || isNaN(ns)) {
      return '';
    }
    const ms = ns / 1e6;
    if (ms >= 100) {
      return ms.toFixed(1);
    }
    if (ms >= 10) {
      return ms.toFixed(2);
    }
    return ms.toFixed(3);
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
