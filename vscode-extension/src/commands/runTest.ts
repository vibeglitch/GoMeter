import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GoMeterBridge } from '../services/gometerBridge';
import { DashboardPanel } from '../views/dashboardPanel';
import { TestPlanItem } from '../providers/testPlanTreeProvider';

let lastExecutedFilePath: string | undefined;

export async function registerRunTestCommand(
  context: vscode.ExtensionContext,
  bridge: GoMeterBridge,
  statusBarItem: vscode.StatusBarItem
) {
  // Command 1: Run active test plan in editor or re-run last active plan
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.runActiveTest', async () => {
      let targetPath: string | undefined;
      const editor = vscode.window.activeTextEditor;
        if (editor && (editor.document.uri.fsPath.endsWith('.yaml') || editor.document.uri.fsPath.endsWith('.yml'))) {
          targetPath = editor.document.uri.fsPath;
        } else if (lastExecutedFilePath && fs.existsSync(lastExecutedFilePath)) {
          targetPath = lastExecutedFilePath;
        } else if (editor) {
          targetPath = editor.document.uri.fsPath;
        }

        if (!targetPath) {
          vscode.window.showErrorMessage('No active test plan open in editor and no previous run found.');
          return;
        }
        await executeTest(targetPath, context, bridge, statusBarItem);
      })
  );

  // Command 2: Run test from tree view
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.runTestFile', async (item: TestPlanItem) => {
      if (!item || !item.filePath) {
        return;
      }
      await executeTest(item.filePath, context, bridge, statusBarItem);
    })
  );

  // Command 3: Stop active test
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.stopActiveTest', () => {
      const stopped = bridge.stopActiveTest();
      if (stopped) {
        vscode.window.showInformationMessage('Tensilix test run stopped.');
        statusBarItem.text = '$(circle-slash) Tensilix: Stopped';
        if (DashboardPanel.currentPanel) {
          DashboardPanel.currentPanel.sendStatus('STOPPED');
        }
      } else {
        vscode.window.showInformationMessage('No active Tensilix test is currently running (test has already completed).');
      }
    })
  );
}

async function executeTest(
  filePath: string,
  context: vscode.ExtensionContext,
  bridge: GoMeterBridge,
  statusBarItem: vscode.StatusBarItem
) {
  lastExecutedFilePath = filePath;
  const panel = DashboardPanel.createOrShow(context.extensionUri, bridge);
  panel.sendStatus('RUNNING');
  statusBarItem.text = '$(sync~spin) Tensilix: Running...';
  statusBarItem.show();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Tensilix: Running ${path.basename(filePath)}`,
      cancellable: true,
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        bridge.stopActiveTest();
      });

      const res = await bridge.runTest(
        filePath,
        (metric) => {
          panel.sendLiveMetric(metric);
        },
        (log) => {
          panel.sendLog(log);
        },
        token
      );

      if (res.report) {
        panel.sendReport(res.report);
      }
      panel.sendHistory(bridge.getRunHistory());

        if (res.stopped) {
          panel.sendStatus('STOPPED');
          statusBarItem.text = '$(circle-slash) Tensilix: Stopped';
          vscode.window.showInformationMessage('Tensilix test run was stopped by user.');
        } else if (res.success) {
          panel.sendStatus('PASSED');
          statusBarItem.text = '$(check) Tensilix: Passed';
          vscode.window.showInformationMessage(
            `Tensilix test passed! Total: ${res.report?.total_requests || 0} reqs @ ${res.report?.requests_per_second || 0} RPS`
          );
        } else {
          panel.sendStatus('FAILED');
          statusBarItem.text = '$(error) Tensilix: Failed';

          let detail = res.error;
          if (res.report && Array.isArray(res.report.thresholds)) {
            const breached = res.report.thresholds.filter((t: any) => !t.passed);
            if (breached.length > 0) {
              detail = 'SLA Breached: ' + breached.map((t: any) =>
                `${t.metric} was ${typeof t.actual === 'number' ? Number(t.actual).toFixed(1) : t.actual}${t.unit || ''} (expected ${t.operator} ${t.expected}${t.unit || ''})`
              ).join('; ');
            }
          }

          const msg = detail || (res.report && !res.report.passed ? 'SLA thresholds breached' : 'Execution error');
          vscode.window.showErrorMessage(`Tensilix test failed: ${msg}`);
        }
      }
  );
}

