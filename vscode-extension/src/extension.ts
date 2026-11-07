import * as vscode from 'vscode';
import { TestPlanTreeProvider, TestPlanItem } from './providers/testPlanTreeProvider';
import { GoMeterCodeLensProvider } from './providers/codeLensProvider';
import { GoMeterBridge } from './services/gometerBridge';
import { LLMService } from './services/llmService';
import { DashboardPanel } from './views/dashboardPanel';
import { registerRunTestCommand } from './commands/runTest';
import { registerGenerateTestCommand } from './commands/generateTest';
import { registerAnalyzeResultsCommand } from './commands/analyzeResults';
import * as path from 'path';
import * as fs from 'fs';

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

  // Tree View Provider with Drag & Drop support
  const treeProvider = new TestPlanTreeProvider();
  const treeView = vscode.window.createTreeView('gometer.testPlansView', {
    treeDataProvider: treeProvider,
    dragAndDropController: treeProvider,
    canSelectMany: true,
  });
  context.subscriptions.push(treeView);

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

  // Command: Refresh Test Plans
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.refreshTestPlans', () => {
      treeProvider.refresh();
    })
  );

  // Command: New Folder in Test Plans
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.newFolder', async (item?: TestPlanItem) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Open a workspace to create a folder.');
        return;
      }

      let parentDir = workspaceFolders[0].uri.fsPath;
      if (item && item.isFolder) {
        parentDir = item.filePath;
      } else if (item && !item.isFolder) {
        parentDir = path.dirname(item.filePath);
      }

      const folderName = await vscode.window.showInputBox({
        prompt: 'Enter folder name for test plans',
        placeHolder: 'e.g., auth, load-tests, integration',
        validateInput: (val) => (!val || /[\\/:*?"<>|]/.test(val) ? 'Invalid folder name' : null),
      });

      if (!folderName) {
        return;
      }

      const targetPath = path.join(parentDir, folderName);
      if (fs.existsSync(targetPath)) {
        vscode.window.showWarningMessage(`Folder '${folderName}' already exists.`);
        return;
      }

      try {
        fs.mkdirSync(targetPath, { recursive: true });
        treeProvider.refresh();
        vscode.window.showInformationMessage(`Created folder: ${folderName}`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to create folder: ${err.message || err}`);
      }
    })
  );

  // Command: New Test Plan in Specific Folder
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.newTestPlanInFolder', async (item?: TestPlanItem) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Open a workspace to create a test plan.');
        return;
      }

      let targetDir = workspaceFolders[0].uri.fsPath;
      if (item && item.isFolder) {
        targetDir = item.filePath;
      } else if (item && !item.isFolder) {
        targetDir = path.dirname(item.filePath);
      }

      const fileName = await vscode.window.showInputBox({
        prompt: 'Enter test plan file name',
        value: 'new-test.gometer.yaml',
        validateInput: (val) =>
          !val || (!val.endsWith('.yaml') && !val.endsWith('.yml'))
            ? 'Filename must end with .yaml or .yml'
            : null,
      });

      if (!fileName) {
        return;
      }

      const filePath = path.join(targetDir, fileName);
      const success = await bridge.initTestPlan(filePath);
      if (success) {
        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Created GoMeter test plan: ${fileName}`);
      } else {
        vscode.window.showErrorMessage('Failed to create test plan.');
      }
    })
  );

  // Command: Delete Test Plan or Folder
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.deleteTestPlan', async (item: TestPlanItem) => {
      if (!item || !item.filePath) {
        return;
      }

      const typeLabel = item.isFolder ? 'folder' : 'test plan';
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ${typeLabel} '${item.label}'?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(item.filePath), {
            recursive: true,
            useTrash: true,
          });
          treeProvider.refresh();
          vscode.window.showInformationMessage(`Deleted ${typeLabel}: ${item.label}`);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to delete: ${err.message || err}`);
        }
      }
    })
  );

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

