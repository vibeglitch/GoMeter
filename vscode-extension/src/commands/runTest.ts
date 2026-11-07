import * as vscode from 'vscode';
import { GoMeterBridge } from '../services/gometerBridge';
import { DashboardPanel } from '../views/dashboardPanel';
import { TestPlanItem } from '../providers/testPlanTreeProvider';

export async function registerRunTestCommand(
  context: vscode.ExtensionContext,
  bridge: GoMeterBridge,
  statusBarItem: vscode.StatusBarItem
) {
  // Command 1: Run active test plan in editor
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.runActiveTest', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active file open in the editor.');
        return;
      }
      await executeTest(editor.document.uri.fsPath, context, bridge, statusBarItem);
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
        vscode.window.showInformationMessage('GoMeter test run stopped.');
        statusBarItem.text = '$(circle-slash) GoMeter: Stopped';
        if (DashboardPanel.currentPanel) {
          DashboardPanel.currentPanel.sendStatus('STOPPED');
        }
      } else {
        vscode.window.showInformationMessage('No active GoMeter test is currently running.');
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
  const panel = DashboardPanel.createOrShow(context.extensionUri);
  panel.sendStatus('RUNNING');
  statusBarItem.text = '$(sync~spin) GoMeter: Running...';
  statusBarItem.show();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `GoMeter: Running ${filePath}`,
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

      if (res.success) {
        statusBarItem.text = '$(check) GoMeter: Passed';
        vscode.window.showInformationMessage(
          `GoMeter test passed! Total: ${res.report?.total_requests || 0} reqs @ ${res.report?.requests_per_second || 0} RPS`
        );
      } else {
        statusBarItem.text = '$(error) GoMeter: Failed';
        const msg = res.error || (res.report && !res.report.passed ? 'SLA thresholds breached' : 'Execution error');
        vscode.window.showErrorMessage(`GoMeter test failed: ${msg}`);
      }
    }
  );
}

