import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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

export class TestPlanItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFolder: boolean = false
  ) {
    super(label, collapsibleState);
    this.resourceUri = vscode.Uri.file(filePath);
    this.tooltip = filePath;

    if (!isFolder) {
      this.contextValue = 'testPlanFile';
      this.iconPath = new vscode.ThemeIcon('beaker');
      this.command = {
        command: 'vscode.open',
        title: 'Open Test Plan',
        arguments: [vscode.Uri.file(filePath)],
      };
      this.description = path.basename(path.dirname(filePath));
    } else {
      this.contextValue = 'testPlanFolder';
      this.iconPath = new vscode.ThemeIcon('folder');
      this.description = '';
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
                true
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
                false
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
