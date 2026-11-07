import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface LiveMetricPayload {
  type: string;
  timestamp: string;
  scenario_name: string;
  request_name: string;
  method?: string;
  url?: string;
  latency_ms: number;
  status_code: number;
  success: boolean;
  request_headers?: Record<string, string>;
  request_body?: string;
  response_headers?: Record<string, string>;
  response_body?: string;
  assertions?: string[];
  error?: string;
}

export interface RunTestResult {
  success: boolean;
  report?: any;
  output: string;
  error?: string;
}

export class GoMeterBridge {
  private activeProcess: cp.ChildProcess | null = null;
  private extensionContext?: vscode.ExtensionContext;

  constructor(context?: vscode.ExtensionContext) {
    this.extensionContext = context;
  }

  /**
   * Resolves the path to the gometer binary
   */
  public resolveBinaryPath(): string {
    // 1. User configured custom path
    const configPath = vscode.workspace
      .getConfiguration('gometer')
      .get<string>('binaryPath', '');

    if (configPath && fs.existsSync(configPath)) {
      return configPath;
    }

    // 2. Bundled binary inside the installed VS Code extension
    if (this.extensionContext) {
      const bundledBin = this.extensionContext.asAbsolutePath(
        path.join('bin', process.platform === 'win32' ? 'gometer.exe' : 'gometer')
      );
      if (fs.existsSync(bundledBin)) {
        try {
          // Ensure executable permissions on Linux/macOS
          if (process.platform !== 'win32') {
            fs.chmodSync(bundledBin, 0o755);
          }
        } catch {
          // Ignore permission set error if read-only
        }
        return bundledBin;
      }
    }

    // 3. Check workspace root bin/gometer
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const localBin = path.join(rootPath, 'bin', 'gometer');
      if (fs.existsSync(localBin)) {
        return localBin;
      }
    }

    // 4. Fallback to system PATH
    return 'gometer';
  }

  /**
   * Validates a test plan file
   */
  public async validate(filePath: string): Promise<{ valid: boolean; output: string }> {
    const binary = this.resolveBinaryPath();
    return new Promise((resolve) => {
      cp.exec(`${binary} validate "${filePath}"`, (err, stdout, stderr) => {
        if (err) {
          resolve({ valid: false, output: stderr || stdout });
        } else {
          resolve({ valid: true, output: stdout });
        }
      });
    });
  }

  /**
   * Initializes a starter test plan
   */
  public async initTestPlan(targetPath: string): Promise<boolean> {
    const binary = this.resolveBinaryPath();
    return new Promise((resolve) => {
      cp.exec(`${binary} init "${targetPath}"`, (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * Executes a test plan and streams live metrics line-by-line
   */
  public runTest(
    filePath: string,
    onLiveMetric: (metric: LiveMetricPayload) => void,
    onLog: (line: string) => void,
    token: vscode.CancellationToken
  ): Promise<RunTestResult> {
    const binary = this.resolveBinaryPath();
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : undefined;

    return new Promise((resolve) => {
      const args = ['run', filePath, '--output', 'json', '--verbose'];
      const proc = cp.spawn(binary, args, { cwd });
      this.activeProcess = proc;

      let stdout = '';
      let stderr = '';
      let buffer = '';
      let report: any = null;

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        buffer += text;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'metric') {
              onLiveMetric(parsed);
            } else if (parsed.type === 'complete' || parsed.type === 'report') {
              report = parsed.report || parsed.data;
            }
          } catch {
            onLog(line);
          }
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        onLog(text);
      });

      const cancelRegistration = token.onCancellationRequested(() => {
        if (this.activeProcess) {
          this.activeProcess.kill('SIGTERM');
        }
      });

      proc.on('close', (code) => {
        cancelRegistration.dispose();
        this.activeProcess = null;

        // If report wasn't parsed from live stream, read reports/latest.json
        if (!report) {
          try {
            const reportDirPath = path.join(cwd || '.', 'reports', 'latest.json');
            if (fs.existsSync(reportDirPath)) {
              report = JSON.parse(fs.readFileSync(reportDirPath, 'utf8'));
            }
          } catch {
            // Ignore file read error
          }
        }

        // Fallback: check stdout lines for JSON report
        if (!report) {
          try {
            const lines = stdout.trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              const l = lines[i].trim();
              if (l.startsWith('{') && l.endsWith('}')) {
                const p = JSON.parse(l);
                if (p.test_name || p.total_requests !== undefined || p.report) {
                  report = p.report || p;
                  break;
                }
              }
            }
          } catch {
            // Ignore line parsing error
          }
        }

        if (code === 0 || code === 2) {
          resolve({
            success: code === 0,
            report,
            output: stdout,
          });
        } else {
          resolve({
            success: false,
            report,
            output: stdout,
            error: stderr || `Process exited with code ${code}`,
          });
        }
      });
    });
  }

  /**
   * Stop active running test
   */
  public stopActiveTest(): boolean {
    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = null;
      return true;
    }
    return false;
  }

  /**
   * Retrieves historical test runs from reports/history/index.json or reports/latest.json
   */
  public getRunHistory(): any[] {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '.';
    const historyIndex = path.join(cwd, 'reports', 'history', 'index.json');
    if (fs.existsSync(historyIndex)) {
      try {
        return JSON.parse(fs.readFileSync(historyIndex, 'utf8'));
      } catch {
        return [];
      }
    }
    const latest = path.join(cwd, 'reports', 'latest.json');
    if (fs.existsSync(latest)) {
      try {
        const r = JSON.parse(fs.readFileSync(latest, 'utf8'));
        return [{
          id: 'latest',
          test_name: r.test_name || 'Latest Run',
          timestamp: r.start_time,
          duration: `${((r.duration || 0) / 1e9).toFixed(1)}s`,
          total_requests: r.total_requests,
          rps: r.requests_per_second,
          p95_latency_ms: (r.p95_latency || 0) / 1e6,
          error_rate: r.error_rate_percent,
          passed: r.passed,
          report_path: latest
        }];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Loads a specific report by ID or latest
   */
  public getReport(reportId: string): any | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '.';
    if (reportId === 'latest') {
      const p = path.join(cwd, 'reports', 'latest.json');
      if (fs.existsSync(p)) {
        try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
      }
    }
    if (path.isAbsolute(reportId) && fs.existsSync(reportId)) {
      try { return JSON.parse(fs.readFileSync(reportId, 'utf8')); } catch {}
    }
    const fileName = reportId.endsWith('.json') ? reportId : `${reportId}.json`;
    const historyPath = path.join(cwd, 'reports', 'history', fileName);
    if (fs.existsSync(historyPath)) {
      try { return JSON.parse(fs.readFileSync(historyPath, 'utf8')); } catch {}
    }
    return null;
  }
}

