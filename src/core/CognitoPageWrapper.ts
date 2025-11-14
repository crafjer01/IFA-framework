import { Page } from "playwright";
import { CognitoConfigType, CognitoPageType } from "../types/index.js";
import { Logger } from "./Logger.js";
import * as fsExtra from "fs-extra";
import * as path from "path";
import { SmartPage } from "./SmartPage.js";

const fs = (fsExtra as any).existsSync ? fsExtra : (fsExtra as any).default;

export class CognitoPageWrapper implements CognitoPageType {
  private page: Page;
  private config: CognitoConfigType;
  private logger: Logger;
  private stepCounter: number = 0;
  private smartPage: SmartPage;

  constructor(page: Page, config: CognitoConfigType, logger: Logger) {
    this.page = page;
    this.config = config;
    this.logger = logger;

    // ← NUEVO: Inicializar SmartPage con opciones del config
    this.smartPage = new SmartPage(page, {
      timeout: config.timeouts.element,
      maxRetries: 3,
    });

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

      // Asegurar que el directorio existe
      await fs.ensureDir(path.dirname(filepath));

      // Tomar el screenshot
      await this.page.screenshot({
        path: filepath,
        fullPage: false, // Solo el viewport visible, más rápido
      });

      //this.logger.info(`Step screenshot saved: ${filename}`);
      return filepath;
    } catch (error) {
      this.logger.warn("Failed to take step screenshot", error as Error);
      return undefined;
    }
  }

  async goto(url: string): Promise<void> {
    try {
      await this.page.goto(url, {
        timeout: this.config.timeouts.navigation,
        waitUntil: "networkidle",
      });

      await this.takeStepScreenshot("goto");
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
    try {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeouts.element,
      });

      await this.page.fill(selector, value);
      await this.takeStepScreenshot("fill");
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

  /**
   * Smart click - usa SmartPage para encontrar elementos inteligentemente
   */
  async smartClick(description: string): Promise<void> {
    try {
      // ← DELEGAMOS a SmartPage que tiene la lógica avanzada
      await this.smartPage.smartClick(description, {
        timeout: this.config.timeouts.element,
      });

      await this.takeStepScreenshot("smart-click");
    } catch (error) {
      this.logger.error(`Smart click failed: ${description}`, error as Error);
      await this.takeStepScreenshot("smart-click-failed");
      throw error;
    }
  }

  /**
   * Smart fill - usa SmartPage para encontrar inputs inteligentemente
   */
  async smartFill(description: string, value: string): Promise<void> {
    try {
      // ← DELEGAMOS a SmartPage que tiene la lógica avanzada
      await this.smartPage.smartFill(description, value, {
        timeout: this.config.timeouts.element,
      });

      await this.takeStepScreenshot("smart-fill");
    } catch (error) {
      this.logger.error(`Smart fill failed: ${description}`, error as Error);
      await this.takeStepScreenshot("smart-fill-failed");
      throw error;
    }
  }

  /**
   * Adaptive wait - espera inteligente por condiciones
   */
  async adaptiveWait(condition: string): Promise<void> {
    try {
      // ← DELEGAMOS a SmartPage
      await this.smartPage.smartWait(condition, {
        timeout: this.config.timeouts.default,
      });
    } catch (error) {
      this.logger.error(`Adaptive wait failed: ${condition}`, error as Error);
      throw error;
    }
  }

  /**
   * Smart select - selecciona opciones de dropdowns inteligentemente
   */
  async smartSelect(description: string, optionText: string): Promise<void> {
    try {
      await this.smartPage.smartSelect(description, optionText, {
        timeout: this.config.timeouts.element,
      });

      await this.takeStepScreenshot("smart-select");
    } catch (error) {
      this.logger.error(`Smart select failed: ${description}`, error as Error);
      await this.takeStepScreenshot("smart-select-failed");
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Expose underlying page for advanced users
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Get the SmartPage instance for advanced usage
   */
  getSmartPage(): SmartPage {
    return this.smartPage;
  }
}
