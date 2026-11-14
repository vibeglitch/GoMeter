import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class SkillInstallerService {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Installs or updates the Tensilix agent skill automatically on extension activation.
   */
  public async autoInstall(silent: boolean = true): Promise<boolean> {
    try {
      const skillNames = ['tensilix-test-architect', 'gometer-test-architect'];
      let installedAny = false;

      for (const skillName of skillNames) {
        const bundledSkillDir = this.context.asAbsolutePath(`skills/${skillName}`);
        if (!fs.existsSync(bundledSkillDir)) {
          continue;
        }

        // 1. Install to Workspace .agents/skills/ (highest priority for project)
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const rootPath = workspaceFolders[0].uri.fsPath;
          const workspaceSkillDir = path.join(rootPath, '.agents', 'skills', skillName);
          const copied = this.copyDirSync(bundledSkillDir, workspaceSkillDir);
          if (copied) installedAny = true;
        }

        // 2. Install to Global ~/.gemini/config/skills/ (Antigravity & Gemini agents)
        const homeDir = os.homedir();
        const geminiSkillDir = path.join(homeDir, '.gemini', 'config', 'skills', skillName);
        try {
          const copied = this.copyDirSync(bundledSkillDir, geminiSkillDir);
          if (copied) installedAny = true;
        } catch {
          // Ignore permission or file system restrictions
        }

        // 3. Install to Global ~/.claude/skills/ (Claude Code agents)
        const claudeSkillDir = path.join(homeDir, '.claude', 'skills', skillName);
        try {
          const copied = this.copyDirSync(bundledSkillDir, claudeSkillDir);
          if (copied) installedAny = true;
        } catch {
          // Ignore permission or file system restrictions
        }
      }

      if (!silent) {
        vscode.window.showInformationMessage(
          'Tensilix: AI Coding Agent skill (tensilix-test-architect) installed successfully! Your IDE agent can now sequence and author API tests.'
        );
      }

      return installedAny;
    } catch (err: any) {
      if (!silent) {
        vscode.window.showErrorMessage(`Failed to install AI Coding Agent skill: ${err.message || err}`);
      }
      return false;
    }
  }

  /**
   * Recursively copies a directory if contents have changed or do not exist.
   */
  private copyDirSync(src: string, dest: string): boolean {
    if (!fs.existsSync(src)) return false;

    fs.mkdirSync(dest, { recursive: true });
    let modified = false;

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        const subModified = this.copyDirSync(srcPath, destPath);
        if (subModified) modified = true;
      } else if (entry.isFile()) {
        let shouldCopy = true;
        if (fs.existsSync(destPath)) {
          try {
            const srcContent = fs.readFileSync(srcPath);
            const destContent = fs.readFileSync(destPath);
            if (srcContent.equals(destContent)) {
              shouldCopy = false;
            }
          } catch {
            shouldCopy = true;
          }
        }

        if (shouldCopy) {
          fs.copyFileSync(srcPath, destPath);
          modified = true;
        }
      }
    }

    return modified;
  }
}

