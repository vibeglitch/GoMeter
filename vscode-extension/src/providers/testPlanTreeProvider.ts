import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class TestPlanItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFolder: boolean = false
  ) {
    super(label, collapsibleState);
    this.tooltip = filePath;
    this.description = path.basename(path.dirname(filePath));

    if (!isFolder) {
      this.contextValue = 'testPlanFile';
      this.iconPath = new vscode.ThemeIcon('beaker');
      this.command = {
        command: 'vscode.open',
        title: 'Open Test Plan',
        arguments: [vscode.Uri.file(filePath)],
      };
    } else {
      this.contextValue = 'testPlanFolder';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

export class TestPlanTreeProvider implements vscode.TreeDataProvider<TestPlanItem> {
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
    if (element) {
      return [];
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const testFiles = await vscode.workspace.findFiles('**/*.{yaml,yml}', '**/node_modules/**');
    const items: TestPlanItem[] = [];

    for (const uri of testFiles) {
      try {
        const content = fs.readFileSync(uri.fsPath, 'utf8');
        // Check if YAML content contains GoMeter markers
        if (content.includes('base_url') && content.includes('scenarios')) {
          const fileName = path.basename(uri.fsPath);
          items.push(
            new TestPlanItem(
              fileName,
              uri.fsPath,
              vscode.TreeItemCollapsibleState.None
            )
          );
        }
      } catch {
        // Skip unreadable files
      }
    }

    return items;
  }
}

