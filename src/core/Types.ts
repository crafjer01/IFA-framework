import { Page } from "playwright";
export interface CognitoConfig {
  browser: {
    headless: boolean;
    slowMo: number;
    args: string[];
    viewport: { width: number; height: number };
    userAgent: string;
    ignoreHTTPSErrors: boolean;
  };

  timeouts: {
    default: number;
    navigation: number;
    element: number;
  };

  features?: {
    aiHealing: {
      enabled: boolean;
      learningRate: number;
    };

    visualTesting: {
      enabled: boolean;
      threshold: number;
    };

    performance?: {
      enabled: boolean;
      budgets: Record<string, number>;
    };
  };

  reporting: {
    html: { enabled: boolean; openAfter: boolean };
    allure: { enabled: boolean; server?: string };
    custom: { enabled: boolean; webhook?: string };
  };

  logging: {
    level: "error" | "warn" | "info" | "debug";
    file?: string;
  };
  resultsBaseDir: string;
}

export interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  timestamp: string;
  error?: string;
  stack?: string;
  screenshots: string[];
  logs: LogEntry[];
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  error?: Error | undefined;
}

export interface CognitoPage {
  // ============================================
  // BASIC PLAYWRIGHT METHODS
  // ============================================

  /**
   * Navigate to a URL
   * @param url - The URL to navigate to
   */
  goto(url: string): Promise<void>;

  /**
   * Click an element using a CSS selector
   * @param selector - CSS selector
   */
  click(selector: string): Promise<void>;

  /**
   * Fill an input element using a CSS selector
   * @param selector - CSS selector
   * @param value - Value to fill
   */
  fill(selector: string, value: string): Promise<void>;

  /**
   * Take a screenshot
   * @param options - Screenshot options
   */
  screenshot(options?: { path: string }): Promise<Buffer>;

  /**
   * Close the page
   */
  close(): Promise<void>;

  /**
   * Set page content
   * @param html - HTML content
   * @param options - Load options
   */
  setContent(
    html: string,
    options?: {
      timeout?: number;
      waitUntil?: "load" | "domcontentloaded" | "networkidle";
    }
  ): Promise<void>;

  // ============================================
  // SMART AI-POWERED METHODS
  // ============================================

  /**
   * Smart click - finds and clicks an element by description
   * Uses AI-powered locators to find elements intelligently
   *
   * @example
   * await page.smartClick('login button');
   * await page.smartClick('submit form');
   * await page.smartClick('close modal');
   *
   * @param description - Natural language description of the element
   */
  smartClick(description: string): Promise<void>;

  /**
   * Smart fill - finds and fills an input by description
   * Uses AI-powered locators to find input fields intelligently
   *
   * @example
   * await page.smartFill('username', 'testuser');
   * await page.smartFill('email address', 'user@example.com');
   * await page.smartFill('password field', 'secret123');
   *
   * @param description - Natural language description of the input
   * @param value - Value to fill
   */
  smartFill(description: string, value: string): Promise<void>;

  /**
   * Smart select - finds and selects an option from a dropdown
   * Uses AI-powered locators to find select elements intelligently
   *
   * @example
   * await page.smartSelect('country dropdown', 'United States');
   * await page.smartSelect('size selector', 'Large');
   *
   * @param description - Natural language description of the select element
   * @param optionText - Text of the option to select
   */
  smartSelect(description: string, optionText: string): Promise<void>;

  /**
   * Adaptive wait - waits for a condition intelligently
   * Uses AI-powered detection to wait for dynamic content
   *
   * @example
   * await page.adaptiveWait('loading complete');
   * await page.adaptiveWait('modal visible');
   * await page.adaptiveWait('data loaded');
   *
   * @param condition - Description of the condition to wait for
   */
  adaptiveWait(condition: string): Promise<void>;

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get the underlying Playwright Page for advanced operations
   * Use this when you need direct access to Playwright's API
   *
   * @example
   * const playwrightPage = page.getPage();
   * await playwrightPage.evaluate(() => console.log('test'));
   */
  getPage(): Page;
}
