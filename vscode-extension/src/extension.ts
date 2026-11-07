import * as vscode from 'vscode';
import { TestPlanTreeProvider } from './providers/testPlanTreeProvider';
import { GoMeterCodeLensProvider } from './providers/codeLensProvider';
import { GoMeterBridge } from './services/gometerBridge';
import { LLMService } from './services/llmService';
import { DashboardPanel } from './views/dashboardPanel';
import { registerRunTestCommand } from './commands/runTest';
import { registerGenerateTestCommand } from './commands/generateTest';
import { registerAnalyzeResultsCommand } from './commands/analyzeResults';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  console.log('GoMeter extension is now active!');

  const bridge = new GoMeterBridge(context);
  const llm = new LLMService();

  // Status Bar
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBar.text = '$(play) GoMeter: Ready';
  statusBar.command = 'gometer.openDashboard';
  statusBar.tooltip = 'Click to open GoMeter Live Dashboard';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Tree View Provider
  const treeProvider = new TestPlanTreeProvider();
  vscode.window.registerTreeDataProvider('gometer.testPlansView', treeProvider);

  // CodeLens Provider for inline Run/Validate buttons
  const codeLensProvider = new GoMeterCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [{ language: 'yaml' }, { pattern: '**/*.{yaml,yml}' }],
      codeLensProvider
    )
  );

  // File system watcher to refresh tree view on YAML changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{yaml,yml}');
  watcher.onDidCreate(() => treeProvider.refresh());
  watcher.onDidChange(() => treeProvider.refresh());
  watcher.onDidDelete(() => treeProvider.refresh());
  context.subscriptions.push(watcher);

  // Register commands
  registerRunTestCommand(context, bridge, statusBar);
  registerGenerateTestCommand(context, llm);
  registerAnalyzeResultsCommand(context, llm);

  // Command: Open Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.openDashboard', () => {
      DashboardPanel.createOrShow(context.extensionUri, bridge);
    })
  );

  // Command: Validate Plan
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.validateTestPlan', async (item) => {
      let filePath = item?.filePath;
      if (!filePath && vscode.window.activeTextEditor) {
        filePath = vscode.window.activeTextEditor.document.uri.fsPath;
      }
      if (!filePath) {
        vscode.window.showErrorMessage('No test plan file selected.');
        return;
      }

      const res = await bridge.validate(filePath);
      if (res.valid) {
        vscode.window.showInformationMessage(`Validation Passed: ${path.basename(filePath)} is valid!`);
      } else {
        vscode.window.showErrorMessage(`Validation Failed:\n${res.output}`);
      }
    })
  );

  // Command: Init Starter Plan
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.initTestPlan', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Open a folder in VS Code to initialize a test plan.');
        return;
      }

      const defaultPath = path.join(workspaceFolders[0].uri.fsPath, 'load-test.gometer.yaml');
      const targetUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultPath),
        filters: { 'GoMeter YAML': ['yaml', 'yml'] },
      });

      if (!targetUri) {
        return;
      }

      const success = await bridge.initTestPlan(targetUri.fsPath);
      if (success) {
        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Created GoMeter test plan: ${path.basename(targetUri.fsPath)}`);
      } else {
        vscode.window.showErrorMessage('Failed to initialize test plan.');
      }
    })
  );
}

export function deactivate() {
  if (DashboardPanel.currentPanel) {
    DashboardPanel.currentPanel.dispose();
  }
}

