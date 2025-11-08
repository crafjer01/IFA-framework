import { Page } from "playwright";
import { CognitoConfig, CognitoPage } from "./Types";
import { Logger } from "./Logger";
import * as fsExtra from "fs-extra";
import * as path from "path";

const fs = (fsExtra as any).existsSync ? fsExtra : (fsExtra as any).default;

export class CognitoPageWrapper implements CognitoPage {
  private page: Page;
  private config: CognitoConfig;
  private logger: Logger;
  private stepCounter: number = 0;

  constructor(page: Page, config: CognitoConfig, logger: Logger) {
    this.page = page;
    this.config = config;
    this.logger = logger;

    // Setup automatic logging for network requests
    this.setupNetworkLogging();

    // Setup console logging
    this.setupConsoleLogging();
  }

  private setupNetworkLogging(): void {
    this.page.on("request", (request) => {
      this.logger.debug(`Request: ${request.method()} ${request.url()}`);
    });

    this.page.on("response", (response) => {
      if (response.status() >= 400) {
        this.logger.warn(
          `Response error: ${response.status()} ${response.url()}`
        );
      } else {
        this.logger.debug(`Response: ${response.status()} ${response.url()}`);
      }
    });
  }

  private setupConsoleLogging(): void {
    this.page.on("console", (msg) => {
      this.logger.debug(`Console ${msg.type()}: ${msg.text()}`);
    });

    this.page.on("pageerror", (error) => {
      this.logger.error("Page error:", error);
    });
  }

  private async takeStepScreenshot(
    action: string
  ): Promise<string | undefined> {
    try {
      this.stepCounter++;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `step-${this.stepCounter}-${action}-${timestamp}.png`;
      const filepath = path.join("cognito-results", "screenshots", filename);

      await fs.ensureDir(path.dirname(filepath));
      await this.page.screenshot({ path: filepath, fullPage: false });

      this.logger.debug(`Step screenshot taken: ${filename}`);
      return filepath;
    } catch (error) {
      this.logger.warn("Failed to take step screenshot", error as Error);
      return undefined;
    }
  }

  async goto(url: string): Promise<void> {
    this.logger.info(`Navigating to: ${url}`);

    try {
      await this.page.goto(url, {
        timeout: this.config.timeouts.navigation,
        waitUntil: "networkidle",
      });

      await this.takeStepScreenshot("goto");
      this.logger.info(`Successfully navigated to: ${url}`);
    } catch (error) {
      this.logger.error(`Failed to navigate to: ${url}`, error as Error);
      throw error;
    }
  }

  async click(selector: string): Promise<void> {
    try {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeouts.element,
      });

      await this.page.click(selector);
      await this.takeStepScreenshot("click");
    } catch (error) {
      this.logger.error(`Failed to click: ${selector}`, error as Error);
      await this.takeStepScreenshot("click-failed");
      throw error;
    }
  }

  async fill(selector: string, value: string): Promise<void> {
    this.logger.info(`Filling element: ${selector} with: ${value}`);

    try {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeouts.element,
      });

      await this.page.fill(selector, value);
      await this.takeStepScreenshot("fill");

      this.logger.info(`Successfully filled: ${selector}`);
    } catch (error) {
      this.logger.error(`Failed to fill: ${selector}`, error as Error);
      await this.takeStepScreenshot("fill-failed");
      throw error;
    }
  }

  async screenshot(options?: { path: string }): Promise<Buffer> {
    const buffer = await this.page.screenshot({
      ...options,
      fullPage: true,
    });

    if (options?.path) {
      await fs.ensureDir(path.dirname(options.path));
    }

    return buffer;
  }

  async close(): Promise<void> {
    // Llama al método close del objeto Page de Playwright
    await this.page.close();
  }

  async setContent(
    html: string,
    options?: {
      timeout?: number;
      waitUntil?: "load" | "domcontentloaded" | "networkidle";
    }
  ): Promise<void> {
    // Delegar la llamada al objeto Page nativo de Playwright
    await this.page.setContent(html, options);
  }

  // Enhanced methods (basic implementation for Sprint 1, will be improved in Sprint 3-4)
  async smartClick(description: string): Promise<void> {
    this.logger.info(`Smart clicking: ${description}`);

    // For Sprint 1, we'll use basic text-based search
    // This will be enhanced with AI in Sprint 3-4
    const textSelector = `text=${description}`;
    const roleSelector = `[role*="${description.toLowerCase()}"]`;
    const ariaSelector = `[aria-label*="${description}"]`;

    const selectors = [textSelector, roleSelector, ariaSelector];

    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 2000 });
        await this.page.click(selector);
        await this.takeStepScreenshot("smart-click");
        this.logger.info(`Smart click successful with selector: ${selector}`);
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error(`Could not find element for smart click: ${description}`);
  }

  async smartFill(description: string, value: string): Promise<void> {
    this.logger.info(`Smart filling: ${description} with: ${value}`);

    // Basic implementation for Sprint 1
    const labelSelector = `input[aria-label*="${description}"]`;
    const placeholderSelector = `input[placeholder*="${description}"]`;
    const nameSelector = `input[name*="${description.toLowerCase()}"]`;

    const selectors = [labelSelector, placeholderSelector, nameSelector];

    for (const selector of selectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 2000 });
        await this.page.fill(selector, value);
        await this.takeStepScreenshot("smart-fill");
        this.logger.info(`Smart fill successful with selector: ${selector}`);
        return;
      } catch {
        // Try next selector
      }
    }

    throw new Error(
      `Could not find input element for smart fill: ${description}`
    );
  }

  async adaptiveWait(condition: string): Promise<void> {
    this.logger.info(`Adaptive waiting for: ${condition}`);

    // Basic implementation for Sprint 1
    if (condition.includes("loading")) {
      await this.page.waitForLoadState("networkidle");
    } else if (condition.includes("visible")) {
      // Extract element from condition
      const element = condition.split(" ")[0];
      await this.page.waitForSelector(element);
    } else {
      // Default wait
      await this.page.waitForTimeout(1000);
    }

    this.logger.info(`Adaptive wait completed for: ${condition}`);
  }

  // Expose underlying page for advanced users
  getPage(): Page {
    return this.page;
  }
}
