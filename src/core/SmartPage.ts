// src/core/SmartPage.ts
import { Page } from "@playwright/test";
import { SmartTextLocator } from "./locators/SmartTextLocator";
import { SmartLocatorOptions, LocatorResult } from "./types/SmartLocator";

export class SmartPage {
  private page: Page;
  private textLocator: SmartTextLocator;
  private options: SmartLocatorOptions;

  constructor(page: Page, options: SmartLocatorOptions = {}) {
    this.page = page;
    this.options = options;
    this.textLocator = new SmartTextLocator(page, options);
  }

  /**
   * Smart click - finds element by descriptive text and clicks it
   */
  async smartClick(
    description: string,
    options?: { timeout?: number }
  ): Promise<void> {
    const result = await this.findElementWithRetry(
      description,
      options?.timeout
    );

    if (!result || !result.element) {
      throw new Error(
        `Could not find clickable element with description: "${description}"`
      );
    }

    try {
      // For ARIA role strategies, wait for visibility first
      if (result.strategy.includes("aria-role")) {
        await result.element.waitForElementState("visible", { timeout: 5000 });
      }
      await result.element.click();
    } catch (error) {
      throw new Error(
        `Element not clickable or visible after timeout: ${error}`
      );
    }
  }

  /**
   * Smart fill - finds input field by description and fills it
   */
  async smartFill(
    description: string,
    value: string,
    options?: { timeout?: number }
  ): Promise<void> {
    console.log(`🔍 smartFill called: "${description}" = "${value}"`);
    const startTime = Date.now();

    const result = await this.findInputElementWithRetry(
      description,
      options?.timeout
    );

    console.log(
      `⏱️ findInputElementWithRetry took ${Date.now() - startTime}ms`
    );
    console.log(`📊 Result:`, result ? `Found (${result.strategy})` : "null");

    if (!result || !result.element) {
      throw new Error(
        `Could not find input field with description: "${description}"`
      );
    }

    // Verify it's an input-like element
    const isInputElement = await this.isInputElement(result.element);
    if (!isInputElement) {
      throw new Error(
        `Found element is not an input field: ${result.selector}`
      );
    }

    try {
      // Wait for element to be visible and editable
      await result.element.waitForElementState("visible", { timeout: 5000 });
      await result.element.waitForElementState("editable", { timeout: 5000 });

      // Clear and fill using element handle methods
      // ElementHandle doesn't have fill(), so we use evaluate to set value directly
      await result.element.evaluate(
        (el: HTMLInputElement | HTMLTextAreaElement, val: string) => {
          el.value = ""; // Clear first
          el.value = val; // Set new value

          // Trigger input events to ensure React/Vue/Angular detect the change
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        },
        value
      );

      console.log(`✅ Successfully filled "${description}" with "${value}"`);
    } catch (error) {
      console.error(`❌ Fill failed for "${description}":`, error);
      throw new Error(
        `Element not visible or fill operation failed: ${description}. Error: ${error}`
      );
    }
  }

  /**
   * Smart select - finds select dropdown and selects option
   */
  async smartSelect(
    description: string,
    optionText: string,
    options?: { timeout?: number }
  ): Promise<void> {
    const result = await this.findSelectElementWithRetry(
      description,
      options?.timeout
    );

    if (!result || !result.element) {
      throw new Error(
        `Could not find select dropdown with description: "${description}"`
      );
    }

    const isSelectElement = await this.isSelectElement(result.element);
    if (!isSelectElement) {
      throw new Error(
        `Found element is not a select dropdown: ${result.selector}`
      );
    }

    try {
      // Wait for visibility
      await result.element.waitForElementState("visible", { timeout: 5000 });

      // Try different selection methods
      const locator = this.page.locator(result.selector!).first();

      try {
        await locator.selectOption({ label: optionText });
      } catch (e1) {
        try {
          await locator.selectOption({ value: optionText });
        } catch (e2) {
          await locator.selectOption(optionText);
        }
      }
    } catch (error) {
      throw new Error(
        `Select operation failed for option "${optionText}": ${error}`
      );
    }
  }

  /**
   * Smart wait - waits for element to appear by description
   * CRITICAL: This re-searches for the element in each iteration to handle dynamic content
   */
  async smartWait(
    description: string,
    options?: {
      timeout?: number;
      state?: "attached" | "detached" | "visible" | "hidden";
    }
  ): Promise<void> {
    const timeout = options?.timeout || this.options.timeout || 30000;
    const state = options?.state || "visible";

    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    let lastError: Error | null = null;

    while (Date.now() - startTime < timeout) {
      try {
        // Re-search for element on each iteration (important for dynamic content)
        const result = await this.textLocator.findByText(description);

        if (result && result.element) {
          try {
            const remainingTime = timeout - (Date.now() - startTime);

            // Wait for the desired state
            await result.element.waitForElementState(state as any, {
              timeout: Math.min(remainingTime, 2000), // Max 2s per check
            });

            // Success! Element found and in desired state
            console.debug(`Element found and ${state}: ${description}`);
            return;
          } catch (stateError) {
            // Element found but not in desired state yet, will retry
            lastError = stateError as Error;
            console.debug(
              `Element found but not yet in state '${state}', retrying...`
            );
          }
        } else {
          console.debug(`Element not found yet: ${description}, retrying...`);
        }
      } catch (searchError) {
        lastError = searchError as Error;
        console.debug(`Search error: ${searchError}`);
      }

      // Wait before next iteration
      await this.page.waitForTimeout(checkInterval);
    }

    // Timeout reached
    throw new Error(
      `Timeout waiting for element: "${description}" to be ${state}. Last error: ${
        lastError?.message || "none"
      }`
    );
  }

  /**
   * Find element with automatic retry logic
   */
  private async findElementWithRetry(
    description: string,
    timeout?: number
  ): Promise<LocatorResult | null> {
    const maxRetries = this.options.maxRetries || 3;
    const timeoutMs = timeout || this.options.timeout || 30000;
    const retryDelay = 500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          this.textLocator.findByText(description),
          new Promise<null>((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout")),
              Math.min(timeoutMs / maxRetries, 8000)
            )
          ),
        ]);

        if (result && result.confidence > 0.5) {
          return result;
        }

        if (result) {
          console.log(
            `Found element but confidence too low: ${result.confidence.toFixed(
              2
            )}`
          );
        }
      } catch (error: any) {
        console.log(`Attempt ${attempt} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelay}ms before retry...`);
        await this.page.waitForTimeout(retryDelay);
      }
    }

    return null;
  }

  /**
   * Find input element with priority for actual input fields
   */
  private async findInputElementWithRetry(
    description: string,
    timeout?: number
  ): Promise<LocatorResult | null> {
    const maxRetries = this.options.maxRetries || 3;
    const timeoutMs = timeout || this.options.timeout || 30000;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `🔄 Attempt ${attempt}/${maxRetries} to find input: "${description}"`
      );

      try {
        const result = await Promise.race([
          this.textLocator.findByText(description, { preferInputs: true }),
          new Promise<null>((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout")),
              timeoutMs / maxRetries
            )
          ),
        ]);

        if (result && result.confidence > 0.5) {
          const isInput = await this.isInputElement(result.element);
          if (isInput) {
            return result;
          } else {
            console.log(
              `Found ${result.selector} but it's not an input, continuing...`
            );
          }
        }

        if (result) {
          console.log(
            `Found element but confidence too low: ${result.confidence.toFixed(
              2
            )}`
          );
        }
      } catch (error: any) {
        console.log(`Attempt ${attempt} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelay}ms before retry...`);
        await this.page.waitForTimeout(retryDelay);
      }
    }

    return null;
  }

  /**
   * Find select element with priority for actual select dropdowns
   */
  private async findSelectElementWithRetry(
    description: string,
    timeout?: number
  ): Promise<LocatorResult | null> {
    const maxRetries = this.options.maxRetries || 3;
    const timeoutMs = timeout || this.options.timeout || 30000;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `Attempt ${attempt}/${maxRetries} to find select: "${description}"`
      );

      try {
        const result = await Promise.race([
          this.textLocator.findByText(description),
          new Promise<null>((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout")),
              timeoutMs / maxRetries
            )
          ),
        ]);

        if (result && result.confidence > 0.5) {
          const isSelect = await this.isSelectElement(result.element);
          if (isSelect) {
            return result;
          } else {
            console.log(
              `Found ${result.selector} but it's not a select, continuing...`
            );
          }
        }
      } catch (error: any) {
        console.log(`Attempt ${attempt} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelay}ms before retry...`);
        await this.page.waitForTimeout(retryDelay);
      }
    }

    return null;
  }

  /**
   * Check if element is an input-like element
   */
  private async isInputElement(element: any): Promise<boolean> {
    try {
      const tagName = await element.evaluate((el: Element) =>
        el.tagName.toLowerCase()
      );
      const type = await element.getAttribute("type");
      const role = await element.getAttribute("role");

      const inputTags = ["input", "textarea"];
      const inputTypes = [
        "text",
        "email",
        "password",
        "search",
        "tel",
        "url",
        "number",
      ];
      const inputRoles = ["textbox", "searchbox"];

      return (
        inputTags.includes(tagName) ||
        (tagName === "input" && (!type || inputTypes.includes(type))) ||
        inputRoles.includes(role || "")
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if element is a select element
   */
  private async isSelectElement(element: any): Promise<boolean> {
    try {
      const tagName = await element.evaluate((el: Element) =>
        el.tagName.toLowerCase()
      );
      const role = await element.getAttribute("role");

      return tagName === "select" || role === "listbox" || role === "combobox";
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current page for direct Playwright operations
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Navigate to URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(options?: {
    path?: string;
    fullPage?: boolean;
  }): Promise<Buffer> {
    return await this.page.screenshot(options);
  }
}
