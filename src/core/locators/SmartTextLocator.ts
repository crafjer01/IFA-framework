// src/core/locators/SmartTextLocator.ts - FIXED VERSION
import { Page, ElementHandle } from "@playwright/test";
import { SmartLocatorOptions, LocatorResult } from "../types/SmartLocator.js";

export class SmartTextLocator {
  private page: Page;
  //private _options: SmartLocatorOptions;

  constructor(page: Page, _options: SmartLocatorOptions = {}) {
    this.page = page;
    // this._options = {
    //   timeout: _options.timeout || 30000,
    //   maxRetries: _options.maxRetries || 3,
    //   confidence: _options.confidence || 0.5,
    //   ..._options,
    // };
  }

  /**
   * Find element by text description using multiple strategies
   */
  async findByText(
    description: string,
    options?: { preferInputs?: boolean }
  ): Promise<LocatorResult | null> {
    const strategies = options?.preferInputs
      ? this.getInputStrategies(description)
      : this.getGeneralStrategies(description);

    for (const strategy of strategies) {
      try {
        const result = await this.tryStrategy(strategy, description);
        if (result) {
          // console.log(
          //   `High confidence match found: ${strategy.name} (${result.confidence})`
          // );
          return result;
        }
      } catch (error) {
        // Continue to next strategy
      }
    }

    return null;
  }

  /**
   * Strategies for finding input elements
   */
  private getInputStrategies(description: string) {
    const lowerDesc = description.toLowerCase();

    return [
      // 1. Label with exact text → find associated input
      {
        name: "label-for-input",
        selector: `label:has-text("${description}")`,
        handler: async (selector: string) => {
          const labels = await this.page.$$(selector);
          for (const label of labels) {
            // Try to find associated input using 'for' attribute
            const forAttr = await label.getAttribute("for");
            if (forAttr) {
              const input = await this.page.$(`#${forAttr}`);
              if (input && (await this.isInputElement(input))) {
                return {
                  element: input,
                  selector: `#${forAttr}`,
                  confidence: 1.0,
                  strategy: "label-for-input",
                };
              }
            }

            // Try to find input inside or next to label
            const inputInside = await label.$("input, textarea, select");
            if (inputInside) {
              return {
                element: inputInside,
                selector: `${selector} input`,
                confidence: 0.95,
                strategy: "label-contains-input",
              };
            }

            // Try next sibling
            const nextInput = await label.evaluateHandle((el) => {
              let next = el.nextElementSibling;
              while (next) {
                if (
                  next.tagName === "INPUT" ||
                  next.tagName === "TEXTAREA" ||
                  next.tagName === "SELECT"
                ) {
                  return next;
                }
                next = next.nextElementSibling;
              }
              return null;
            });

            if (nextInput && (await this.isInputElement(nextInput as any))) {
              return {
                element: nextInput as any,
                selector: `${selector} + input`,
                confidence: 0.9,
                strategy: "label-next-sibling",
              };
            }
          }
          return null;
        },
      },

      // 2. Input with matching name attribute
      {
        name: "input-name",
        selector: `input[name*="${lowerDesc}"], textarea[name*="${lowerDesc}"]`,
        confidence: 0.9,
      },

      // 3. Input with matching id
      {
        name: "input-id",
        selector: `input[id*="${lowerDesc}"], textarea[id*="${lowerDesc}"]`,
        confidence: 0.85,
      },

      // 4. Input with matching placeholder
      {
        name: "input-placeholder",
        selector: `input[placeholder*="${description}"], textarea[placeholder*="${description}"]`,
        confidence: 0.8,
      },

      // 5. Input with matching aria-label
      {
        name: "input-aria-label",
        selector: `input[aria-label*="${description}"], textarea[aria-label*="${description}"]`,
        confidence: 0.85,
      },

      // 6. Any input near text (fuzzy search)
      {
        name: "text-near-input",
        selector: `text=${description}`,
        handler: async (selector: string) => {
          const elements = await this.page.$$(selector);
          for (const el of elements) {
            // Find nearest input
            const nearestInput = await el.evaluateHandle((element) => {
              const inputs = document.querySelectorAll(
                'input:not([type="hidden"]), textarea, select'
              );
              let closest: Element | null = null;
              let minDistance = Infinity;

              const rect1 = element.getBoundingClientRect();

              inputs.forEach((input) => {
                const rect2 = input.getBoundingClientRect();
                const distance = Math.sqrt(
                  Math.pow(rect1.x - rect2.x, 2) +
                    Math.pow(rect1.y - rect2.y, 2)
                );

                if (distance < minDistance && distance < 200) {
                  minDistance = distance;
                  closest = input;
                }
              });

              return closest;
            });

            if (
              nearestInput &&
              (await this.isInputElement(nearestInput as any))
            ) {
              return {
                element: nearestInput as any,
                selector: selector + " (nearest input)",
                confidence: 0.7,
                strategy: "text-near-input",
              };
            }
          }
          return null;
        },
      },
    ];
  }

  /**
   * General strategies for finding any element
   */
  private getGeneralStrategies(description: string) {
    return [
      // Exact text match
      {
        name: "exact-text",
        selector: `text="${description}"`,
        confidence: 1.0,
      },

      // Partial text match
      {
        name: "partial-text",
        selector: `text=${description}`,
        confidence: 0.9,
      },

      // Button with text
      {
        name: "button-text",
        selector: `button:has-text("${description}")`,
        confidence: 0.95,
      },

      // Link with text
      {
        name: "link-text",
        selector: `a:has-text("${description}")`,
        confidence: 0.95,
      },

      // ARIA label
      {
        name: "aria-label",
        selector: `[aria-label*="${description}"]`,
        confidence: 0.85,
      },

      // ARIA role with text
      {
        name: "aria-role",
        selector: `[role="button"]:has-text("${description}"), [role="link"]:has-text("${description}")`,
        confidence: 0.8,
      },

      // Title attribute
      {
        name: "title-attr",
        selector: `[title*="${description}"]`,
        confidence: 0.7,
      },
    ];
  }

  /**
   * Try a single strategy
   */
  private async tryStrategy(
    strategy: any,
    _description: string
  ): Promise<LocatorResult | null> {
    try {
      // If strategy has custom handler, use it
      if (strategy.handler) {
        const result = await strategy.handler(strategy.selector);
        return result;
      }

      // Otherwise, use default selector-based approach
      const elements = await this.page.$$(strategy.selector);

      if (elements.length === 0) {
        return null;
      }

      // Return first visible element
      for (const element of elements) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          return {
            element,
            selector: strategy.selector,
            confidence: strategy.confidence || 0.8,
            strategy: strategy.name,
          };
        }
      }

      // If no visible elements, return first one anyway
      return {
        element: elements[0],
        selector: strategy.selector,
        confidence: strategy.confidence || 0.8,
        strategy: strategy.name,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if element is an input-like element
   */
  private async isInputElement(element: ElementHandle): Promise<boolean> {
    try {
      const tagName = await element.evaluate((el: Element) =>
        el.tagName.toLowerCase()
      );
      const type = await element.getAttribute("type");

      const inputTags = ["input", "textarea", "select"];
      const validInputTypes = [
        "text",
        "email",
        "password",
        "search",
        "tel",
        "url",
        "number",
        "date",
        "time",
        null,
        undefined,
      ];

      return (
        inputTags.includes(tagName) &&
        (tagName !== "input" || validInputTypes.includes(type))
      );
    } catch (error) {
      return false;
    }
  }
}
