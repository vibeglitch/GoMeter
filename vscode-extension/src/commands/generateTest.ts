import * as vscode from 'vscode';
import { LLMService } from '../services/llmService';
import * as path from 'path';

export function registerGenerateTestCommand(
  context: vscode.ExtensionContext,
  llm: LLMService
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('gometer.generateTestWithAI', async () => {
      const userPrompt = await vscode.window.showInputBox({
        prompt: 'Describe the API test scenario you want to generate with AI',
        placeHolder: 'e.g. Load test my /api/orders endpoint with 25 concurrent users for 45 seconds with 200 status assertions',
        ignoreFocusOut: true,
      });

      if (!userPrompt) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'GoMeter: Generating test plan with AI...',
          cancellable: true,
        },
        async (progress, token) => {
          try {
            const yamlContent = await llm.generateTestPlan(userPrompt, token);

            // Open as new untitled YAML document in VS Code
            const doc = await vscode.workspace.openTextDocument({
              language: 'yaml',
              content: yamlContent,
            });

            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('GoMeter test plan generated successfully!');
          } catch (err: any) {
            vscode.window.showErrorMessage(`AI Test Generation failed: ${err.message || err}`);
          }
        }
      );
    })
  );
}

