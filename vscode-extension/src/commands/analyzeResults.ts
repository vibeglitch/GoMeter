import * as vscode from 'vscode';
import { LLMService } from '../services/llmService';
import * as path from 'path';
import * as fs from 'fs';

export function registerAnalyzeResultsCommand(
  context: vscode.ExtensionContext,
  llm: LLMService
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.analyzeReportWithAI', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace open to locate test reports.');
        return;
      }

      const rootPath = workspaceFolders[0].uri.fsPath;
      const latestPath = path.join(rootPath, 'reports', 'latest.json');

      let reportData = '';
      if (fs.existsSync(latestPath)) {
        reportData = fs.readFileSync(latestPath, 'utf8');
      } else {
        // Let user pick a json report
        const files = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectMany: false,
          filters: { 'JSON Reports': ['json'] },
          openLabel: 'Select Tensilix Report',
        });
        if (!files || files.length === 0) {
          return;
        }
        reportData = fs.readFileSync(files[0].fsPath, 'utf8');
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Tensilix: Diagnosing performance results with AI...',
          cancellable: true,
        },
        async (progress, token) => {
          try {
            const analysisMarkdown = await llm.analyzeResults(reportData, token);

            // Open analysis in a markdown document beside current editor
            const doc = await vscode.workspace.openTextDocument({
              language: 'markdown',
              content: `# Tensilix AI Performance Diagnosis\n\n${analysisMarkdown}`,
            });

            await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
          } catch (err: any) {
            vscode.window.showErrorMessage(`AI Analysis failed: ${err.message || err}`);
          }
        }
      );
    })
  );
}

