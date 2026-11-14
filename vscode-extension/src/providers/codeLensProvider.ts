import * as vscode from 'vscode';

export class GoMeterCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const text = document.getText();
    // Only provide CodeLens if this looks like a GoMeter file
    if (!text.includes('base_url') && !text.includes('scenarios')) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];

    // Find the top 'name:' or line 0 to place the top Run & Validate lenses
    const firstLineRange = new vscode.Range(0, 0, 0, 0);

    const runCommand: vscode.Command = {
      title: '$(play) Run Tensilix Test',
      command: 'gometer.runActiveTest',
      tooltip: 'Execute this Tensilix test plan in the live dashboard',
    };
    lenses.push(new vscode.CodeLens(firstLineRange, runCommand));

    const validateCommand: vscode.Command = {
      title: '$(check) Validate Plan',
      command: 'gometer.validateTestPlan',
      tooltip: 'Validate YAML schema and configuration',
    };
    lenses.push(new vscode.CodeLens(firstLineRange, validateCommand));

    const dashboardCommand: vscode.Command = {
      title: '$(graph-line) Open Dashboard',
      command: 'gometer.openDashboard',
      tooltip: 'Open Tensilix Live Dashboard panel',
    };
    lenses.push(new vscode.CodeLens(firstLineRange, dashboardCommand));

    return lenses;
  }
}

