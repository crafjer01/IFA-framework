import { LocatorResult, SmartLocatorOptions } from "@fau/types/SmartLocator";
import { Page } from "@playwright/test";

export class SmartTextLocator {
  private page: Page;
  private options: SmartLocatorOptions;

  constructor(page: Page, options: SmartLocatorOptions = {}) {
    this.page = page;
    this.options = {
      threshold: 0.3,
      timeout: 30000,
      ignoreCase: true,
      trimWhitespace: true,
      languages: ["en", "es", "fr"],
      maxRetries: 3,
      ...options,
    };
  }

  async findByText(
    searchText: string,
    options?: { preferInputs?: boolean }
  ): Promise<LocatorResult | null> {
    if (!searchText || typeof searchText !== "string") {
      return null;
    }

    const trimmedText = searchText.trim();
    if (trimmedText.length === 0) {
      return null;
    }

    if (trimmedText.length === 1) {
      console.debug("Very short search text");
    }

    // Check if using ARIA role syntax
    const ariaRoleParsed = this.parseAriaRoleSyntax(searchText);
    if (ariaRoleParsed) {
      // First try native getByRole
      const ariaRoleResult = await this.findByAriaRole(searchText);
      if (ariaRoleResult) return ariaRoleResult;

      // Then try implicit role with all ARIA attributes
      const implicitRoleResult = await this.findByImplicitRole(searchText);
      if (implicitRoleResult) return implicitRoleResult;
    }

    let strategies;

    if (options?.preferInputs) {
      strategies = [
        () => this.findByPlaceholder(searchText),
        () => this.findByAriaLabel(searchText),
        () => this.findByLabelledBy(searchText),
        () => this.findByTitle(searchText),
        () => this.findByExactText(searchText),
        () => this.findByPartialText(searchText),
        () => this.findByButtonText(searchText),
        () => this.findByLinkText(searchText),
        () => this.findByFuzzyText(searchText),
      ];
    } else {
      strategies = [
        () => this.findByButtonText(searchText),
        () => this.findByLinkText(searchText),
        () => this.findByAriaLabel(searchText),
        () => this.findByLabelledBy(searchText),
        () => this.findByPlaceholder(searchText),
        () => this.findByTitle(searchText),
        () => this.findByExactText(searchText),
        () => this.findByPartialText(searchText),
        () => this.findByFuzzyText(searchText),
      ];
    }

    let bestResult: LocatorResult | null = null;

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          if (result.confidence >= 0.95) {
            console.debug(
              `High confidence match found: ${result.strategy} (${result.confidence})`
            );
            return result;
          }

          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = result;
            console.debug(
              `Better match found: ${result.strategy} (${result.confidence})`
            );
          }
        }
      } catch (error) {
        console.debug(`Strategy ${strategy.name} failed:`, error);
      }
    }

    if (bestResult && bestResult.confidence > 0.5) {
      console.debug(
        `Best match selected: ${bestResult.strategy} (${bestResult.confidence})`
      );
      return bestResult;
    }

    console.debug(`No acceptable match found for: "${searchText}"`);
    return null;
  }

  /**
   * Find element by aria-labelledby attribute
   */
  private async findByLabelledBy(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const elements = await this.page.$$("[aria-labelledby]");

    for (const element of elements) {
      const labelledById = await element.getAttribute("aria-labelledby");
      if (!labelledById) continue;

      const labelIds = labelledById.split(" ");
      for (const labelId of labelIds) {
        try {
          const labelElement = await this.page.$(`#${labelId}`);
          if (labelElement) {
            const labelText = await this.getElementText(labelElement);
            const normalizedLabel = this.normalizeText(labelText);

            if (
              normalizedLabel === normalizedSearch ||
              normalizedLabel.includes(normalizedSearch) ||
              normalizedSearch.includes(normalizedLabel)
            ) {
              return {
                element,
                confidence: 0.95,
                strategy: "aria-labelledby",
                matchedText: labelText,
                selector: await this.getElementSelector(element),
              };
            }
          }
        } catch (error) {
          console.debug(`Error processing labelledby ID ${labelId}:`, error);
        }
      }
    }

    return null;
  }

  private async findByExactText(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const selectors = [
      "button",
      'input[type="button"]',
      'input[type="submit"]',
      "a",
      "select",
      "input",
      "textarea",
      '[role="button"]',
      "label",
      "span",
      "div",
      "p",
    ];

    for (const selector of selectors) {
      const elements = await this.page.$$(selector);

      if (!elements) continue;

      for (const element of elements) {
        const elementText = await this.getElementText(element);
        if (this.normalizeText(elementText) === normalizedSearch) {
          return {
            element,
            confidence: 1.0,
            strategy: "exact-text",
            matchedText: elementText,
            selector: await this.getElementSelector(element),
          };
        }
      }
    }

    return null;
  }

  private async findByPartialText(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    if (normalizedSearch.length < 3) return null;

    const selectors = [
      "button",
      'input[type="button"]',
      'input[type="submit"]',
      "a",
      '[role="button"]',
      "label",
      "span",
      "div",
    ];

    let bestMatch: LocatorResult | null = null;

    for (const selector of selectors) {
      const elements = await this.page.$$(selector);

      if (!elements) continue;

      for (const element of elements) {
        const elementText = await this.getElementText(element);
        const normalizedElement = this.normalizeText(elementText);

        if (normalizedElement.includes(normalizedSearch)) {
          const confidence = this.calculatePartialMatchConfidence(
            normalizedSearch,
            normalizedElement
          );

          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              element,
              confidence,
              strategy: "partial-text",
              matchedText: elementText,
              selector: await this.getElementSelector(element),
            };
          }
        }
      }
    }

    return bestMatch;
  }

  private async findByFuzzyText(
    searchText: string
  ): Promise<LocatorResult | null> {
    const allElements = await this.page.$$("*");
    const elementTexts: Array<{
      element: any;
      text: string;
      selector: string;
      similarity: number;
    }> = [];

    for (const element of allElements) {
      const text = await this.getElementText(element);
      if (text && text.length > 0 && text.length < 200) {
        const similarity = this.calculateTextSimilarity(searchText, text);
        if (similarity > this.options.threshold!) {
          elementTexts.push({
            element,
            text,
            selector: await this.getElementSelector(element),
            similarity,
          });
        }
      }
    }

    if (elementTexts.length > 0) {
      const bestResult = elementTexts.sort(
        (a, b) => b.similarity - a.similarity
      )[0];
      return {
        element: bestResult.element,
        confidence: bestResult.similarity,
        strategy: "fuzzy-text",
        matchedText: bestResult.text,
        selector: bestResult.selector,
      };
    }

    return null;
  }

  private calculateTextSimilarity(search: string, target: string): number {
    const searchNorm = this.normalizeText(search);
    const targetNorm = this.normalizeText(target);

    if (searchNorm === targetNorm) return 1.0;

    if (targetNorm.includes(searchNorm)) return 0.9;

    const searchWords = searchNorm.split(" ");
    const targetWords = targetNorm.split(" ");
    const commonWords = searchWords.filter((word) =>
      targetWords.some((targetWord) => targetWord.includes(word))
    );
    const wordSimilarity = commonWords.length / searchWords.length;

    const charSimilarity =
      1 -
      this.levenshteinDistance(searchNorm, targetNorm) /
        Math.max(searchNorm.length, targetNorm.length);

    return Math.max(wordSimilarity * 0.7, charSimilarity * 0.6);
  }

  private async findByAriaLabel(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const elements = await this.page.$$("[aria-label]");

    if (!elements) return null;

    for (const element of elements) {
      const ariaLabel = await element.getAttribute("aria-label");
      if (ariaLabel && this.normalizeText(ariaLabel) === normalizedSearch) {
        return {
          element,
          confidence: 0.9,
          strategy: "aria-label",
          matchedText: ariaLabel,
          selector: await this.getElementSelector(element),
        };
      }
    }

    return null;
  }

  /**
   * Parse ARIA role syntax: 'role[description]'
   */
  private parseAriaRoleSyntax(
    searchText: string
  ): { role: string; description: string } | null {
    const rolePattern = /^(\w+)\[([^\]]+)\]$/;
    const match = searchText.match(rolePattern);

    if (match) {
      return {
        role: match[1],
        description: match[2].trim(),
      };
    }

    return null;
  }

  /**
   * Find by ARIA role + description using Playwright's native getByRole
   * This tries both exact match and regex-based partial match
   */
  private async findByAriaRole(
    searchText: string
  ): Promise<LocatorResult | null> {
    const parsed = this.parseAriaRoleSyntax(searchText);

    if (!parsed) {
      return null;
    }

    const { role, description } = parsed;
    const cleanDescription = description.trim();

    let locator = null;
    let elementHandle = null;
    let confidence = 0.0;
    let strategy = "";

    // Strategy 1: Exact match
    try {
      console.log(
        `Trying exact match for role="${role}" name="${cleanDescription}"`
      );
      locator = this.page
        .getByRole(role as any, {
          name: cleanDescription,
          exact: true,
        })
        .first();

      elementHandle = await locator.elementHandle({ timeout: 1000 });

      if (elementHandle) {
        console.log(`Exact match found!`);
        confidence = 1.0;
        strategy = "aria-role-native-exact";
      } else {
        console.log(`No element handle from exact match`);
      }
    } catch (e) {
      console.log(`Exact match failed:`);
      // Continue to partial match
    }

    // Strategy 2: Partial match with RegExp
    if (!elementHandle) {
      try {
        const escapedDescription = cleanDescription.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const fuzzyRegExpString = escapedDescription.split(/\s+/).join(".*?");

        const partialNameRegExp = new RegExp(fuzzyRegExpString, "i");

        locator = this.page
          .getByRole(role as any, {
            name: partialNameRegExp,
          })
          .first();

        elementHandle = await locator.elementHandle({
          timeout: 2000, // Solo 2 segundos
        } as any);

        if (elementHandle) {
          confidence = 0.9;
          strategy = "aria-role-native-partial";
        }
      } catch (e) {
        console.debug(`findByAriaRole failed for ${role}[${cleanDescription}]`);
        return null;
      }
    }

    if (elementHandle && locator) {
      const selector = locator.toString();

      return {
        element: elementHandle,
        confidence: confidence,
        strategy: strategy,
        matchedText: `${role}[${description}]`,
        selector: selector,
      };
    }

    return null;
  }

  /**
   * Find by implicit ARIA role (native HTML semantics)
   * Now checks: aria-label, aria-labelledby, aria-describedby, placeholder, text content
   */
  private async findByImplicitRole(
    searchText: string
  ): Promise<LocatorResult | null> {
    const parsed = this.parseAriaRoleSyntax(searchText);

    if (!parsed) {
      return null;
    }

    const { role, description } = parsed;

    const roleToElementMap: Record<string, string[]> = {
      button: [
        '[role="button"]',
        "button",
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
      ],
      textbox: [
        '[role="textbox"]',
        "input:not([type])",
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="search"]',
        'input[type="tel"]',
        'input[type="url"]',
        "textarea",
      ],
      checkbox: ['input[type="checkbox"]'],
      radio: ['input[type="radio"]'],
      link: ["a[href]"],
      heading: ["h1", "h2", "h3", "h4", "h5", "h6"],
      list: ["ul", "ol"],
      listitem: ["li"],
      img: ["img"],
      table: ["table"],
      row: ["tr"],
      cell: ["td", "th"],
      form: ["form"],
      navigation: ["nav"],
      main: ["main"],
      complementary: ["aside"],
      contentinfo: ["footer"],
      banner: ["header"],
      search: ["search"],
      alert: ['[role="alert"]', "div", "span"],
      dialog: ["dialog", '[role="dialog"]'],
      menu: ["menu"],
      menuitem: ["menuitem"],
      tab: ['[role="tab"]'],
      tabpanel: ['[role="tabpanel"]'],
    };

    const selectors = roleToElementMap[role.toLowerCase()];

    if (!selectors) {
      console.debug(`Unknown role: ${role}`);
      // Try to find element with explicit role attribute
      try {
        const elements = await this.page.$$(`[role="${role}"]`);
        if (elements && elements.length > 0) {
          const normalizedDescription = this.normalizeText(description);

          for (const element of elements) {
            // Check aria-label first for unknown roles
            const ariaLabel = await element.getAttribute("aria-label");
            if (ariaLabel) {
              const normalizedLabel = this.normalizeText(ariaLabel);

              if (
                this.matchesDescription(normalizedDescription, normalizedLabel)
              ) {
                const confidence = this.calculatePartialMatchConfidence(
                  normalizedDescription,
                  normalizedLabel
                );

                return {
                  element,
                  confidence,
                  strategy: "unknown-aria-role",
                  matchedText: `${role}[${ariaLabel}]`,
                  selector: await this.getElementSelector(element),
                };
              }
            }

            // Then try text content
            const elementText = await this.getElementText(element);
            const normalizedElement = this.normalizeText(elementText);

            if (
              this.matchesDescription(normalizedDescription, normalizedElement)
            ) {
              const confidence = this.calculatePartialMatchConfidence(
                normalizedDescription,
                normalizedElement
              );

              return {
                element,
                confidence,
                strategy: "unknown-aria-role-text",
                matchedText: `${role}[${elementText}]`,
                selector: await this.getElementSelector(element),
              };
            }
          }
        }
      } catch (e) {
        console.debug(`Error finding unknown role ${role}:`, e);
      }

      return null;
    }

    const normalizedDescription = this.normalizeText(description);
    let bestMatch: LocatorResult | null = null;

    for (const selector of selectors) {
      try {
        const elements = await this.page.$$(selector);

        if (!elements || elements.length === 0) continue;

        for (const element of elements) {
          // Priority 1: aria-label
          const ariaLabel = await element.getAttribute("aria-label");
          if (ariaLabel) {
            const normalizedLabel = this.normalizeText(ariaLabel);

            if (
              this.matchesDescription(normalizedDescription, normalizedLabel)
            ) {
              const confidence = this.calculatePartialMatchConfidence(
                normalizedDescription,
                normalizedLabel
              );

              if (!bestMatch || confidence > bestMatch.confidence) {
                bestMatch = {
                  element,
                  confidence,
                  strategy: "implicit-aria-role-label",
                  matchedText: `${role}[${ariaLabel}]`,
                  selector: await this.getElementSelector(element),
                };
              }
            }
          }

          // Priority 2: aria-labelledby
          const labelledById = await element.getAttribute("aria-labelledby");
          if (labelledById) {
            const labelIds = labelledById.split(" ");
            for (const labelId of labelIds) {
              try {
                const labelElement = await this.page.$(`#${labelId}`);
                if (labelElement) {
                  const labelText = await this.getElementText(labelElement);
                  const normalizedLabel = this.normalizeText(labelText);

                  if (
                    this.matchesDescription(
                      normalizedDescription,
                      normalizedLabel
                    )
                  ) {
                    const confidence = this.calculatePartialMatchConfidence(
                      normalizedDescription,
                      normalizedLabel
                    );

                    if (!bestMatch || confidence > bestMatch.confidence) {
                      bestMatch = {
                        element,
                        confidence,
                        strategy: "implicit-aria-role-labelledby",
                        matchedText: `${role}[${labelText}]`,
                        selector: await this.getElementSelector(element),
                      };
                    }
                  }
                }
              } catch (e) {
                // Continue to next label
              }
            }
          }

          // Priority 3: aria-describedby
          const describedById = await element.getAttribute("aria-describedby");
          if (describedById) {
            const descIds = describedById.split(" ");
            for (const descId of descIds) {
              try {
                const descElement = await this.page.$(`#${descId}`);
                if (descElement) {
                  const descText = await this.getElementText(descElement);
                  const normalizedDesc = this.normalizeText(descText);

                  if (
                    this.matchesDescription(
                      normalizedDescription,
                      normalizedDesc
                    )
                  ) {
                    const confidence =
                      this.calculatePartialMatchConfidence(
                        normalizedDescription,
                        normalizedDesc
                      ) * 0.95; // Slightly lower confidence

                    if (!bestMatch || confidence > bestMatch.confidence) {
                      bestMatch = {
                        element,
                        confidence,
                        strategy: "implicit-aria-role-describedby",
                        matchedText: `${role}[${descText}]`,
                        selector: await this.getElementSelector(element),
                      };
                    }
                  }
                }
              } catch (e) {
                // Continue
              }
            }
          }

          // Priority 4: placeholder (for textbox)
          if (role === "textbox") {
            const placeholder = await element.getAttribute("placeholder");
            if (placeholder) {
              const normalizedPlaceholder = this.normalizeText(placeholder);

              if (
                this.matchesDescription(
                  normalizedDescription,
                  normalizedPlaceholder
                )
              ) {
                const confidence = this.calculatePartialMatchConfidence(
                  normalizedDescription,
                  normalizedPlaceholder
                );

                if (!bestMatch || confidence > bestMatch.confidence) {
                  bestMatch = {
                    element,
                    confidence,
                    strategy: "implicit-aria-role-placeholder",
                    matchedText: `${role}[${placeholder}]`,
                    selector: await this.getElementSelector(element),
                  };
                }
              }
            }
          }

          // Priority 5: Text content (lowest priority)
          const elementText = await this.getElementText(element);
          if (elementText) {
            const normalizedElement = this.normalizeText(elementText);

            if (
              this.matchesDescription(normalizedDescription, normalizedElement)
            ) {
              const confidence =
                this.calculatePartialMatchConfidence(
                  normalizedDescription,
                  normalizedElement
                ) * 0.85; // Lower confidence for text content

              if (!bestMatch || confidence > bestMatch.confidence) {
                bestMatch = {
                  element,
                  confidence,
                  strategy: "implicit-aria-role-text",
                  matchedText: `${role}[${elementText}]`,
                  selector: await this.getElementSelector(element),
                };
              }
            }
          }
        }
      } catch (error) {
        console.debug(`Error with selector ${selector}:`, error);
        continue;
      }
    }

    return bestMatch;
  }

  /**
   * Helper to check if description matches target using multiple strategies
   */
  private matchesDescription(description: string, target: string): boolean {
    return (
      target === description ||
      target.includes(description) ||
      description.includes(target) ||
      this.fuzzyContains(target, description)
    );
  }

  private async findByPlaceholder(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const elements = await this.page.$$(
      "input[placeholder], textarea[placeholder]"
    );

    for (const element of elements) {
      const placeholder = await element.getAttribute("placeholder");
      if (
        placeholder &&
        this.normalizeText(placeholder).includes(normalizedSearch)
      ) {
        const confidence = this.calculatePartialMatchConfidence(
          normalizedSearch,
          this.normalizeText(placeholder)
        );

        return {
          element,
          confidence,
          strategy: "placeholder",
          matchedText: placeholder,
          selector: await this.getElementSelector(element),
        };
      }
    }

    return null;
  }

  private async findByTitle(searchText: string): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const elements = await this.page.$$("[title]");

    for (const element of elements) {
      const title = await element.getAttribute("title");
      if (title && this.normalizeText(title).includes(normalizedSearch)) {
        return {
          element,
          confidence: 0.8,
          strategy: "title",
          matchedText: title,
          selector: await this.getElementSelector(element),
        };
      }
    }

    return null;
  }

  private async findByButtonText(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const buttonSelectors = [
      "button",
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="reset"]',
      '[role="button"]',
    ];

    let bestResult: LocatorResult | null = null;

    for (const selector of buttonSelectors) {
      const buttons = await this.page.$$(selector);

      if (!buttons) continue;

      for (const button of buttons) {
        const text = await this.getElementText(button);
        const value = await button.getAttribute("value");

        const textToCheck = text || value || "";
        const normalizedText = this.normalizeText(textToCheck);

        let confidence = 0;

        if (normalizedText === normalizedSearch) {
          confidence = 1.0;
        } else if (normalizedText.includes(normalizedSearch)) {
          confidence = 0.95;
        } else if (value && this.normalizeText(value) === normalizedSearch) {
          confidence = 1.0;
        }

        if (
          confidence > 0 &&
          (!bestResult || confidence > bestResult.confidence)
        ) {
          bestResult = {
            element: button,
            confidence,
            strategy: "button-text",
            matchedText: textToCheck,
            selector: await this.getElementSelector(button),
          };
        }
      }
    }

    return bestResult;
  }

  private async findByLinkText(
    searchText: string
  ): Promise<LocatorResult | null> {
    const normalizedSearch = this.normalizeText(searchText);

    const links = await this.page.$$("a");

    for (const link of links) {
      const text = await this.getElementText(link);
      if (this.normalizeText(text).includes(normalizedSearch)) {
        const confidence = this.calculatePartialMatchConfidence(
          normalizedSearch,
          this.normalizeText(text)
        );

        return {
          element: link,
          confidence,
          strategy: "link-text",
          matchedText: text,
          selector: await this.getElementSelector(link),
        };
      }
    }

    return null;
  }

  private async getElementText(element: any): Promise<string> {
    try {
      const textContent = await element.textContent();
      const innerText = await element.innerText().catch(() => "");
      const value = await element.inputValue().catch(() => "");

      return textContent || innerText || value || "";
    } catch (error) {
      return "";
    }
  }

  private async getElementSelector(element: any): Promise<string> {
    try {
      const tagName = await element.evaluate((el: Element) =>
        el.tagName.toLowerCase()
      );
      const id = await element.getAttribute("id");
      const className = await element.getAttribute("class");

      if (id) return `${tagName}#${id}`;
      if (className) return `${tagName}.${className.split(" ")[0]}`;
      return tagName;
    } catch (error) {
      return "unknown";
    }
  }

  private normalizeText(text: string): string {
    if (!text) return "";

    let normalized = text;

    if (this.options.trimWhitespace) {
      normalized = normalized.trim().replace(/\s+/g, " ");
    }

    if (this.options.ignoreCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  private calculatePartialMatchConfidence(
    search: string,
    target: string
  ): number {
    if (search === target) return 1.0;
    if (target.startsWith(search)) return 0.9;
    if (target.endsWith(search)) return 0.8;
    if (target.includes(search)) return 0.7;

    const distance = this.levenshteinDistance(search, target);
    const maxLength = Math.max(search.length, target.length);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private fuzzyContains(target: string, search: string): boolean {
    const searchWords = search.split(" ").filter((w) => w.length > 2);
    const targetWords = target.split(" ");

    if (searchWords.length === 0) return false;

    const matchedWords = searchWords.filter((searchWord) =>
      targetWords.some((targetWord) => targetWord.includes(searchWord))
    );

    return matchedWords.length / searchWords.length >= 0.7;
  }
}
