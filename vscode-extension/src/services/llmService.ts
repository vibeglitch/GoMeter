import * as vscode from 'vscode';

export class LLMService {
  /**
   * Selects an available language model from VS Code (Copilot or registered vendors)
   */
  private async getModel(): Promise<vscode.LanguageModelChat | undefined> {
    try {
      // 1. Try selecting copilot models
      let models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (models && models.length > 0) {
        return models[0];
      }

      // 2. Fallback to any registered chat model
      models = await vscode.lm.selectChatModels();
      if (models && models.length > 0) {
        return models[0];
      }
    } catch (e) {
      console.warn('vscode.lm API model selection error:', e);
    }
    return undefined;
  }

  /**
   * Generates a YAML test plan using LLMs
   */
  public async generateTestPlan(prompt: string, token: vscode.CancellationToken): Promise<string> {
    const model = await this.getModel();
    if (!model) {
      throw new Error(
        'No Language Model available in VS Code. Please ensure GitHub Copilot or an LM extension is active.'
      );
    }

    const systemPrompt = `You are an expert Performance & QA Engineer specializing in GoMeter (a Go-based JMeter alternative).
Your task is to generate a valid, production-ready GoMeter YAML test plan based on the user's requirements.

Schema Guidelines:
- Root fields: name, description, base_url, defaults, scenarios
- defaults.headers: JSON headers, authorization
- scenarios: list of scenarios with:
    name, virtual_users (e.g. 10), duration (e.g. 30s), ramp_up (e.g. 5s), think_time (e.g. 250ms)
    requests: list with name, method (GET, POST, PUT, DELETE), path, body (if POST/PUT), assertions, extract
    thresholds: p95_latency (<500ms), error_rate (<1%)
- Output ONLY the raw YAML. Do not wrap in commentary or markdown codeblocks.`;

    const messages = [
      vscode.LanguageModelChatMessage.User(`${systemPrompt}\n\nUser Request: ${prompt}`),
    ];

    const response = await model.sendRequest(messages, {}, token);

    let output = '';
    for await (const chunk of response.text) {
      output += chunk;
    }

    // Clean any accidental markdown fence
    let cleaned = output.trim();
    if (cleaned.startsWith('```yaml')) {
      cleaned = cleaned.replace(/^```yaml\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return cleaned;
  }

  /**
   * Analyzes test results and provides performance optimization insights
   */
  public async analyzeResults(reportJson: string, token: vscode.CancellationToken): Promise<string> {
    const model = await this.getModel();
    if (!model) {
      throw new Error(
        'No Language Model available in VS Code. Please ensure GitHub Copilot or an LM extension is active.'
      );
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(`You are a Senior Performance Architect analyzing a GoMeter load test execution report.
Please analyze the following test metrics and provide:
1. Executive Summary (Pass/Fail, Total Requests, RPS, Error Rate)
2. Bottleneck Detection (High p95/p99 latency endpoints, error codes)
3. Infrastructure & Code Recommendations (Connection pooling, DB indexing, caching, concurrency limits)
4. Readiness for Production

Report Data:
${reportJson}`),
    ];

    const response = await model.sendRequest(messages, {}, token);

    let output = '';
    for await (const chunk of response.text) {
      output += chunk;
    }

    return output;
  }
}

