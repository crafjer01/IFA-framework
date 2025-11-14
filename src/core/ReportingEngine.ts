import * as fsExtra from "fs-extra";
import * as path from "path";
import { TestResultType } from "../types/index.js";

// Determinar el objeto correcto: si fsExtra tiene existsSync, lo usamos; si no, usamos fsExtra.default
const fs = (fsExtra as any).existsSync ? fsExtra : (fsExtra as any).default;

export class ReportingEngine {
  private results: TestResultType[] = [];
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    fs.ensureDirSync("fau-results/reports");
    fs.ensureDirSync("fau-results/screenshots");
  }

  async addResult(result: TestResultType): Promise<void> {
    this.results.push(result);
  }

  async generateReports(): Promise<void> {
    if (this.config.html.enabled) {
      await this.generateHtmlReport();
    }

    if (this.config.allure.enabled) {
      await this.generateAllureReport();
    }

    if (this.config.custom.enabled) {
      await this.generateCustomReport();
    }
  }

  private async generateHtmlReport(): Promise<void> {
    const htmlTemplate = this.getHtmlTemplate();
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateSummary(),
    };

    const htmlContent = htmlTemplate
      .replace("{{REPORT_DATA}}", JSON.stringify(reportData))
      .replace("{{TIMESTAMP}}", reportData.timestamp)
      .replace("{{SUMMARY}}", JSON.stringify(reportData.summary));

    const reportPath = path.join("fau-results", "reports", "index.html");
    await fs.writeFile(reportPath, htmlContent);

    console.log(`📊 HTML report generated: ${reportPath}`);

    if (this.config.html.openAfter) {
      // Open report in browser (implementation depends on platform)
      console.log("Opening report in browser...");
    }
  }

  private async generateAllureReport(): Promise<void> {
    // Basic Allure integration for Sprint 1
    // Full implementation will be in Sprint 11-12
    const allureResults = this.results.map((result) => ({
      uuid: `test-${Date.now()}-${Math.random()}`,
      name: result.name,
      status: result.status,
      start: new Date(result.timestamp).getTime(),
      stop: new Date(result.timestamp).getTime() + result.duration,
      attachments: result.screenshots.map((screenshot) => ({
        name: "Screenshot",
        source: path.basename(screenshot),
        type: "image/png",
      })),
    }));

    await fs.writeJSON(
      path.join("fau-results", "reports", "allure-results.json"),
      allureResults,
      { spaces: 2 }
    );

    console.log("📋 Allure results generated");
  }

  private async generateCustomReport(): Promise<void> {
    const customReport = {
      framework: "FAU",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateSummary(),
    };

    await fs.writeJSON(
      path.join("fau-results", "reports", "fau-report.json"),
      customReport,
      { spaces: 2 }
    );

    if (this.config.custom.webhook) {
      // Send to webhook (implementation for Sprint 1)
      console.log(
        `🔗 Custom report would be sent to: ${this.config.custom.webhook}`
      );
    }
  }

  private generateSummary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === "passed").length;
    const failed = this.results.filter((r) => r.status === "failed").length;
    const skipped = this.results.filter((r) => r.status === "skipped").length;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
    };
  }

  private getHtmlTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAU Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 24px; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .results { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-result { padding: 10px; border-left: 4px solid #28a745; margin: 10px 0; background: #f8f9fa; }
        .test-result.failed { border-left-color: #dc3545; }
        .test-name { font-weight: bold; margin-bottom: 5px; }
        .test-duration { color: #6c757d; font-size: 0.9em; }
        .error { color: #dc3545; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 FAU Test Report</h1>
        <p>Generated: {{TIMESTAMP}}</p>
    </div>
    
    <div class="summary" id="summary"></div>
    <div class="results" id="results"></div>

    <script>
        const reportData = {{REPORT_DATA}};
        
        // Render summary
        const summaryEl = document.getElementById('summary');
        summaryEl.innerHTML = \`
            <div class="stat">
                <div class="stat-value">\${reportData.summary.total}</div>
                <div>Total</div>
            </div>
            <div class="stat">
                <div class="stat-value passed">\${reportData.summary.passed}</div>
                <div>Passed</div>
            </div>
            <div class="stat">
                <div class="stat-value failed">\${reportData.summary.failed}</div>
                <div>Failed</div>
            </div>
            <div class="stat">
                <div class="stat-value">\${reportData.summary.passRate}%</div>
                <div>Pass Rate</div>
            </div>
        \`;
        
        // Render results
        const resultsEl = document.getElementById('results');
        resultsEl.innerHTML = '<h3>Test Results</h3>' + 
            reportData.results.map(result => \`
                <div class="test-result \${result.status}">
                    <div class="test-name">\${result.name}</div>
                    <div class="test-duration">Duration: \${result.duration}ms</div>
                    \${result.error ? \`<div class="error">\${result.error}</div>\` : ''}
                </div>
            \`).join('');
    </script>
</body>
</html>`;
  }
}
