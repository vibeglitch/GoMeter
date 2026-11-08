import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'bin',
  '.tools',
  'vendor',
  'reports',
  '.gemini',
  '.vscode',
  'coverage',
]);

export function isGoMeterTestFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.yaml' && ext !== '.yml') return false;

    const base = path.basename(filePath).toLowerCase();
    if (base.includes('.gometer.')) return true;

    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('scenarios') && (content.includes('base_url') || content.includes('defaults'));
  } catch {
    return false;
  }
}

export function containsTestPlans(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) return false;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (containsTestPlans(fullPath)) return true;
      } else if (entry.isFile()) {
        if (isGoMeterTestFile(fullPath)) return true;
      }
    }
  } catch {
    // Ignore filesystem read errors
  }
  return false;
}

export function findAllTestPlans(dirPath: string): string[] {
  const results: string[] = [];
  try {
    if (!fs.existsSync(dirPath)) return results;
    const stat = fs.statSync(dirPath);
    if (stat.isFile()) {
      if (isGoMeterTestFile(dirPath)) {
        results.push(dirPath);
      }
      return results;
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...findAllTestPlans(fullPath));
      } else if (entry.isFile() && isGoMeterTestFile(fullPath)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore filesystem read errors
  }
  return results.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function formatLatencyNs(ns: number | undefined): string {
  if (ns === undefined || ns === null || isNaN(ns)) return '0ms';
  const ms = ns / 1e6;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms >= 10) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(2)}ms`;
}

function loadAllReports(workspaceRoot: string): any[] {
  const reportsDir = path.join(workspaceRoot, 'reports');
  const list: any[] = [];
  const latestPath = path.join(reportsDir, 'latest.json');
  if (fs.existsSync(latestPath)) {
    try {
      const l = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
      if (l && l.test_name) {
        list.push({
          id: 'latest',
          test_name: l.test_name,
          timestamp: l.start_time,
          duration: `${((l.duration || 0) / 1e9).toFixed(1)}s`,
          duration_ns: l.duration,
          total_requests: l.total_requests,
          rps: l.requests_per_second,
          p95_latency_ms: (l.p95_latency || 0) / 1e6,
          p95_latency: l.p95_latency,
          error_rate: l.error_rate_percent,
          error_rate_percent: l.error_rate_percent,
          passed: l.passed,
          report_path: latestPath,
          full_report: l,
        });
      }
    } catch {}
  }

  const historyIndex = path.join(reportsDir, 'history', 'index.json');
  if (fs.existsSync(historyIndex)) {
    try {
      const hist = JSON.parse(fs.readFileSync(historyIndex, 'utf8'));
      if (Array.isArray(hist)) {
        for (const item of hist) {
          if (!list.some((existing) => existing.test_name === item.test_name && existing.timestamp === item.timestamp)) {
            list.push(item);
          }
        }
      }
    } catch {}
  }
  return list;
}

function findReportForPlan(filePath: string, reports: any[], workspaceRoot: string): any | null {
  let planName = path.basename(filePath);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(raw) as any;
    if (doc && typeof doc === 'object' && doc.name) {
      planName = doc.name;
    }
  } catch {}

  const baseName = path.basename(filePath);
  const rawName = path.parse(filePath).name;
  const match = reports.find(
    (r) =>
      r.test_name === planName ||
      r.test_name === baseName ||
      r.test_name === rawName
  );

  if (!match) return null;

  if (match.full_report) return match.full_report;

  if (match.report_path) {
    const fullP = path.isAbsolute(match.report_path)
      ? match.report_path
      : path.join(workspaceRoot, match.report_path);
    if (fs.existsSync(fullP)) {
      try {
        const full = JSON.parse(fs.readFileSync(fullP, 'utf8'));
        match.full_report = full;
        return full;
      } catch {}
    }
  }

  return match;
}

export class TestPlanItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFolder: boolean = false,
    reports: any[] = [],
    workspaceRoot: string = ''
  ) {
    super(label, collapsibleState);
    this.resourceUri = vscode.Uri.file(filePath);

    if (!isFolder) {
      this.contextValue = 'testPlanFile';
      this.command = {
        command: 'vscode.open',
        title: 'Open Test Plan',
        arguments: [vscode.Uri.file(filePath)],
      };
      this.buildFileTooltipAndMetrics(reports, workspaceRoot);
    } else {
      this.contextValue = 'testPlanFolder';
      this.iconPath = new vscode.ThemeIcon('folder');
      this.buildFolderTooltipAndMetrics(reports, workspaceRoot);
    }
  }

  private buildFileTooltipAndMetrics(reports: any[], workspaceRoot: string): void {
    const report = findReportForPlan(this.filePath, reports, workspaceRoot);
    if (report) {
      const isPassed = report.passed !== false;
      const statusIcon = isPassed ? '🟢' : '🔴';
      const statusText = isPassed ? '$(pass-filled) PASSED' : '$(error) FAILED';
      const totalReqs = (report.total_requests || 0).toLocaleString();
      const rps = typeof report.requests_per_second === 'number'
        ? report.requests_per_second.toFixed(1)
        : (typeof report.rps === 'number' ? report.rps.toFixed(1) : '0');
      const errRate = typeof report.error_rate_percent === 'number'
        ? `${report.error_rate_percent.toFixed(1)}%`
        : (typeof report.error_rate === 'number' ? `${report.error_rate.toFixed(1)}%` : '0%');
      const durSec = report.duration
        ? (typeof report.duration === 'number' ? `${(report.duration / 1e9).toFixed(1)}s` : String(report.duration))
        : '';
      const timeStr = report.start_time || report.timestamp ? new Date(report.start_time || report.timestamp).toLocaleString() : '';

      const md = new vscode.MarkdownString();
      md.isTrusted = true;
      md.supportThemeIcons = true;

      md.appendMarkdown(`### ⚡ \`${path.basename(this.filePath)}\`\n`);
      md.appendMarkdown(`**${report.test_name || path.basename(this.filePath)}**\n\n`);
      md.appendMarkdown(`---\n`);
      md.appendMarkdown(`#### 📊 Latest Test Results\n`);
      md.appendMarkdown(`- **Status**: ${statusText} ${statusIcon}\n`);
      if (timeStr) md.appendMarkdown(`- **Executed**: ${timeStr}\n`);
      if (durSec) md.appendMarkdown(`- **Duration**: **${durSec}**\n`);
      md.appendMarkdown(`- **Total Requests**: **${totalReqs}** reqs\n`);
      md.appendMarkdown(`- **Throughput**: **${rps}** req/s\n`);
      md.appendMarkdown(`- **Error Rate**: **${errRate}**\n`);

      if (report.min_latency !== undefined || report.avg_latency !== undefined) {
        const minL = formatLatencyNs(report.min_latency);
        const avgL = formatLatencyNs(report.avg_latency);
        const maxL = formatLatencyNs(report.max_latency);
        const p90L = formatLatencyNs(report.p90_latency);
        const p95L = formatLatencyNs(report.p95_latency);
        const p99L = formatLatencyNs(report.p99_latency);
        md.appendMarkdown(`- **Latency Breakdown**:\n`);
        md.appendMarkdown(`  - **Min**: ${minL} | **Avg**: ${avgL} | **Max**: ${maxL}\n`);
        md.appendMarkdown(`  - **p90**: ${p90L} | **p95**: ${p95L} | **p99**: ${p99L}\n`);
      } else if (report.p95_latency_ms !== undefined) {
        md.appendMarkdown(`- **P95 Latency**: **${report.p95_latency_ms}ms**\n`);
      }

      md.appendMarkdown(`\n---\n`);
      md.appendMarkdown(`*Click $(export) to export test results as CSV*\n`);
      this.tooltip = md;

      const p95Disp = report.p95_latency !== undefined
        ? formatLatencyNs(report.p95_latency)
        : (report.p95_latency_ms !== undefined ? `${report.p95_latency_ms}ms` : '');
      this.description = isPassed
        ? `🟢 ${rps} RPS • ${p95Disp}`
        : `🔴 ${errRate} err • ${rps} RPS`;
      this.iconPath = isPassed
        ? new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'))
        : new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
    } else {
      const md = new vscode.MarkdownString();
      md.isTrusted = true;
      md.supportThemeIcons = true;
      md.appendMarkdown(`### ⚡ \`${path.basename(this.filePath)}\`\n`);
      md.appendMarkdown(`**Status**: ⚪ *Not yet executed*\n\n`);
      md.appendMarkdown(`---\n`);
      md.appendMarkdown(`*Click $(play) in the row or CodeLens to run this test plan*\n`);
      this.tooltip = md;
      this.description = '⚪ Not run';
      this.iconPath = new vscode.ThemeIcon('beaker');
    }
  }

  private buildFolderTooltipAndMetrics(reports: any[], workspaceRoot: string): void {
    const planFiles = findAllTestPlans(this.filePath);
    const executedResults: { file: string; rep: any }[] = [];
    for (const file of planFiles) {
      const rep = findReportForPlan(file, reports, workspaceRoot);
      if (rep) {
        executedResults.push({ file, rep });
      }
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;

    const folderName = path.basename(this.filePath);
    md.appendMarkdown(`### 📁 Folder: \`${folderName}\`\n`);
    md.appendMarkdown(`**${planFiles.length} Test Plans** (${executedResults.length} executed, ${planFiles.length - executedResults.length} pending)\n\n`);
    md.appendMarkdown(`---\n`);

    if (executedResults.length > 0) {
      const passedCount = executedResults.filter((e) => e.rep.passed !== false).length;
      const failedCount = executedResults.filter((e) => e.rep.passed === false).length;
      let totalReqs = 0;
      let totalRps = 0;
      let maxP95Ns = 0;

      for (const e of executedResults) {
        totalReqs += e.rep.total_requests || 0;
        const rpsVal = typeof e.rep.requests_per_second === 'number'
          ? e.rep.requests_per_second
          : (typeof e.rep.rps === 'number' ? e.rep.rps : 0);
        totalRps += rpsVal;
        const p95 = typeof e.rep.p95_latency === 'number'
          ? e.rep.p95_latency
          : (typeof e.rep.p95_latency_ms === 'number' ? e.rep.p95_latency_ms * 1e6 : 0);
        if (p95 > maxP95Ns) maxP95Ns = p95;
      }

      md.appendMarkdown(`#### 📊 Aggregate Folder Test Results\n`);
      md.appendMarkdown(`- **Results Status**: 🟢 **${passedCount} Passed**, ${failedCount > 0 ? `🔴 **${failedCount} Failed**` : '🔴 0 Failed'}\n`);
      md.appendMarkdown(`- **Total Requests**: **${totalReqs.toLocaleString()}** reqs\n`);
      md.appendMarkdown(`- **Combined Throughput**: **${totalRps.toFixed(1)}** req/s\n`);
      if (maxP95Ns > 0) {
        md.appendMarkdown(`- **Worst P95 Latency**: **${formatLatencyNs(maxP95Ns)}**\n`);
      }

      md.appendMarkdown(`\n**Plan Breakdown**:\n`);
      for (const e of executedResults) {
        const isPass = e.rep.passed !== false;
        const name = e.rep.test_name || path.basename(e.file);
        const pRps = typeof e.rep.requests_per_second === 'number'
          ? e.rep.requests_per_second.toFixed(1)
          : (typeof e.rep.rps === 'number' ? e.rep.rps.toFixed(1) : '0');
        md.appendMarkdown(`- ${isPass ? '🟢' : '🔴'} **${name}**: ${(e.rep.total_requests || 0).toLocaleString()} reqs @ ${pRps} RPS\n`);
      }

      md.appendMarkdown(`\n---\n`);
      md.appendMarkdown(`*Click $(export) to export all folder test results as CSV*\n`);
      this.tooltip = md;
      this.description = `${passedCount}/${executedResults.length} passed (${planFiles.length} plans)`;
    } else {
      md.appendMarkdown(`⚪ *No test plans in this folder have been executed yet.*\n\n`);
      md.appendMarkdown(`---\n`);
      md.appendMarkdown(`*Click on individual test plans to run them*\n`);
      this.tooltip = md;
      this.description = `${planFiles.length} plan${planFiles.length === 1 ? '' : 's'}`;
    }
  }
}

export class TestPlanTreeProvider
  implements vscode.TreeDataProvider<TestPlanItem>, vscode.TreeDragAndDropController<TestPlanItem>
{
  dropMimeTypes = ['application/vnd.code.tree.gometerTestPlans', 'text/uri-list'];
  dragMimeTypes = ['application/vnd.code.tree.gometerTestPlans'];

  private _onDidChangeTreeData: vscode.EventEmitter<TestPlanItem | undefined | void> =
    new vscode.EventEmitter<TestPlanItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TestPlanItem | undefined | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TestPlanItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TestPlanItem): Promise<TestPlanItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }
    const rootPath = workspaceFolders[0].uri.fsPath;

    const currentDir = element ? element.filePath : rootPath;
    if (!fs.existsSync(currentDir)) {
      return [];
    }

    try {
      const reports = loadAllReports(rootPath);
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      const folderItems: TestPlanItem[] = [];
      const fileItems: TestPlanItem[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Include directory if it contains test plans or is explicitly in a test folder
          if (containsTestPlans(fullPath) || element !== undefined) {
            folderItems.push(
              new TestPlanItem(
                entry.name,
                fullPath,
                vscode.TreeItemCollapsibleState.Collapsed,
                true,
                reports,
                rootPath
              )
            );
          }
        } else if (entry.isFile()) {
          if (isGoMeterTestFile(fullPath)) {
            fileItems.push(
              new TestPlanItem(
                entry.name,
                fullPath,
                vscode.TreeItemCollapsibleState.None,
                false,
                reports,
                rootPath
              )
            );
          }
        }
      }

      folderItems.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
      fileItems.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

      return [...folderItems, ...fileItems];
    } catch {
      return [];
    }
  }

  // Drag and Drop Controller Implementation
  handleDrag(
    source: readonly TestPlanItem[],
    treeDataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void {
    treeDataTransfer.set(
      'application/vnd.code.tree.gometerTestPlans',
      new vscode.DataTransferItem(source)
    );
  }

  async handleDrop(
    target: TestPlanItem | undefined,
    sources: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;

    // Resolve destination folder
    let targetDir: string;
    if (!target) {
      targetDir = rootPath;
    } else if (target.isFolder) {
      targetDir = target.filePath;
    } else {
      targetDir = path.dirname(target.filePath);
    }

    // 1. Handle internal tree items drag
    const internalTransfer = sources.get('application/vnd.code.tree.gometerTestPlans');
    if (internalTransfer && Array.isArray(internalTransfer.value)) {
      const items: TestPlanItem[] = internalTransfer.value;

      for (const item of items) {
        if (token.isCancellationRequested) break;
        const sourcePath = item.filePath;
        if (!fs.existsSync(sourcePath)) continue;

        const fileName = path.basename(sourcePath);
        const destinationPath = path.join(targetDir, fileName);

        if (sourcePath === destinationPath) continue;

        if (item.isFolder && destinationPath.startsWith(sourcePath + path.sep)) {
          vscode.window.showWarningMessage(`Cannot move folder '${item.label}' into itself.`);
          continue;
        }

        try {
          await vscode.workspace.fs.rename(
            vscode.Uri.file(sourcePath),
            vscode.Uri.file(destinationPath),
            { overwrite: false }
          );
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to move ${fileName}: ${err.message || err}`);
        }
      }
    }

    // 2. Handle text/uri-list from Explorer / external
    const uriTransfer = sources.get('text/uri-list');
    if (uriTransfer && typeof uriTransfer.value === 'string') {
      const uriStrings = uriTransfer.value.split(/\r?\n/).filter(Boolean);
      for (const uriStr of uriStrings) {
        try {
          const uri = vscode.Uri.parse(uriStr);
          if (uri.scheme === 'file') {
            const sourcePath = uri.fsPath;
            if (!fs.existsSync(sourcePath)) continue;
            const fileName = path.basename(sourcePath);
            const destinationPath = path.join(targetDir, fileName);
            if (sourcePath === destinationPath) continue;

            await vscode.workspace.fs.rename(
              vscode.Uri.file(sourcePath),
              vscode.Uri.file(destinationPath),
              { overwrite: false }
            );
          }
        } catch {
          // Skip invalid URIs
        }
      }
    }

    this.refresh();
  }
}
