import { Browser, BrowserContext } from "@playwright/test";
import {
  CognitoConfigType,
  TestResultType,
  CognitoPageType,
} from "../types/index.js";
import { ConfigManager } from "./ConfigManager.js";
import { Logger } from "./Logger.js";
import { ReportingEngine } from "./ReportingEngine.js";
import { CognitoPageWrapper } from "./CognitoPageWrapper.js";

export class CognitoEngine {
  private config: CognitoConfigType;
  private logger: Logger;
  private reportingEngine: ReportingEngine;
  private browser?: Browser;
  private context?: BrowserContext;

  constructor(config?: Partial<CognitoConfigType>) {
    this.config = ConfigManager.loadConfig(config);
    this.logger = new Logger(this.config.logging);
    this.reportingEngine = new ReportingEngine(this.config.reporting);
  }

  async initialize(): Promise<void> {
    try {
      const { chromium } = await import("playwright");

      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo,
        args: this.config.browser.args,
      });

      this.context = await this.browser.newContext({
        viewport: this.config.browser.viewport,
        userAgent: this.config.browser.userAgent,
        ignoreHTTPSErrors: this.config.browser.ignoreHTTPSErrors,
      });
    } catch (error) {
      this.logger.error("Failed to initialize browser", error as Error);
      throw error;
    }
  }

  async newPage(): Promise<CognitoPageType> {
    if (!this.context) {
      throw new Error("Engine not initialized. Call initialize() first.");
    }

    const page = await this.context.newPage();
    const CognitPage = new CognitoPageWrapper(page, this.config, this.logger);

    // Setup automatic screenshot on failure
    page.on("pageerror", async (error) => {
      await this.captureFailureEvidence(CognitPage, error);
    });

    return CognitPage;
  }

  async runTest(
    testFn: (page: CognitoPageType) => Promise<void>,
    testName: string
  ): Promise<TestResultType> {
    const startTime = Date.now();
    let result: TestResultType;

    try {
      const page = await this.newPage();
      await testFn(page);

      result = {
        name: testName,
        status: "passed",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        screenshots: [],
        logs: this.logger.getLogs(),
      };
    } catch (error) {
      result = {
        name: testName,
        status: "failed",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        stack: (error as Error).stack ?? "",
        screenshots: [],
        logs: this.logger.getLogs(),
      };

      this.logger.error(`Test failed: ${testName}`, error as Error);
    }

    await this.reportingEngine.addResult(result);
    return result;
  }

  async runTestSuite(
    tests: Array<{ name: string; fn: (page: CognitoPageType) => Promise<void> }>
  ): Promise<TestResultType[]> {
    const results: TestResultType[] = [];

    this.logger.info(`Running test suite with ${tests.length} tests`);

    for (const test of tests) {
      const result = await this.runTest(test.fn, test.name);
      results.push(result);
    }

    await this.reportingEngine.generateReports();

    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    this.logger.info(
      `Test suite completed: ${passed} passed, ${failed} failed`
    );

    return results;
  }

  private async captureFailureEvidence(
    page: CognitoPageType,
    _error: Error
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `failure-${timestamp}.png`;

      await page.screenshot({ path: `./fau-results/screenshots/${filename}` });
      this.logger.info(`Failure screenshot captured: ${filename}`);
    } catch (screenshotError) {
      this.logger.warn(
        "Failed to capture failure screenshot",
        screenshotError as Error
      );
    }
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      this.logger.error("Error closing FAU Engine", error as Error);
    }
  }
}
