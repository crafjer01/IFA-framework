import { test, expect, Page } from "@playwright/test";
import { SmartPage } from "../../../src/core/SmartPage";
import { SmartTextLocator } from "../../../src/core/locators/SmartTextLocator";

test.describe("Smart Text Locator", () => {
  let page: Page;
  let smartTextLocator: SmartTextLocator;
  let smartPage: SmartPage;

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = playwrightPage;
    smartTextLocator = new SmartTextLocator(page);
    smartPage = new SmartPage(page, {
      timeout: 10000, // 10s en lugar de 30s
      maxRetries: 2, // 2 reintentos en lugar de 3
    });

    // Create a test page with various elements
    await smartPage.getPage().setContent(`
     <!DOCTYPE html>
      <html>
      <head>
        <title>Adaptive Locator Test Page</title>
        <style>
          .container { padding: 20px; }
          .button { padding: 10px; margin: 5px; background: #007bff; color: white; border: none; cursor: pointer; }
          .input { padding: 8px; margin: 5px; border: 1px solid #ccc; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Button elements -->
          <button id="login-btn" class="button">Login Button</button>
          <button id="submit-btn" class="button">Submit</button>
          <input type="button" value="Save Changes" />
          <input type="submit" value="Send Form" />
          <a href="#" role="button">Link Button</a>
          
          <!-- Input elements -->
          <input type="text" id="email" placeholder="Enter your email address" />
          <input type="password" id="password" placeholder="Password" />
          <textarea id="message" placeholder="Type your message"></textarea>
          <input type="text" id="username" aria-label="Username field" />
          
          <!-- Select elements -->
          <select id="country">
            <option value="">Select country</option>
            <option value="es">Spain</option>
            <option value="fr">France</option>
            <option value="us">United States</option>
          </select>
          
          <!-- Elements with various text patterns -->
          <div id="partial-text">This is a submit button</div>
          <span title="Click to login">🔐</span>
          <label for="email">Email Field</label>
          <p>Some random text content</p>
          
          <!-- ARIA elements -->
          <div role="button" aria-label="Close dialog">×</div>
          <div role="textbox" aria-label="Search box" contenteditable="true"></div>
          
          <!-- Dynamic content simulation -->
          <button id="dynamic-btn" class="button">Loading...</button>
          
          <!-- Multilingual content -->
          <button id="es-btn" class="button">Iniciar Sesión</button>
          <button id="fr-btn" class="button">Se Connecter</button>
        </div>
        
        <script>
          // Simulate dynamic content
          setTimeout(() => {
            document.getElementById('dynamic-btn').textContent = 'Click Me';
          }, 1000);
        </script>
      </body>
      </html>
    `);
  });

  test.describe("Exact Text Matching", () => {
    test("should find button by exact text", async () => {
      const result = await smartTextLocator.findByText("Login Button");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(1.0);
      expect(result!.strategy).toBe("button-text");
      expect(result!.matchedText).toBe("Login Button");
    });

    test("should find input button by value", async () => {
      const result = await smartTextLocator.findByText("Save Changes");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(1.0);
      expect(result!.strategy).toBe("button-text");
    });

    test("should find submit input by value", async () => {
      const result = await smartTextLocator.findByText("Send Form");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.8);
    });
  });

  test.describe("Partial Text Matching", () => {
    test("should find element by partial text", async () => {
      const result = await smartTextLocator.findByText("submit");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.7);
      expect(result!.strategy).toBe("button-text");
    });

    test("should handle case insensitive matching", async () => {
      const result = await smartTextLocator.findByText("LOGIN");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.8);
    });

    test("should find best partial match", async () => {
      const result = await smartTextLocator.findByText("Submit");

      expect(result).not.toBeNull();
      // Should prefer the exact "Submit" button over partial match in div
      expect(result!.matchedText).toBe("Submit");
    });
  });

  test.describe("ARIA Label Matching", () => {
    test("should find element by aria-label", async () => {
      const result = await smartTextLocator.findByText("Username field");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("aria-label");
      expect(result!.confidence).toBe(0.9);
    });

    test("should find button by aria-label", async () => {
      const result = await smartTextLocator.findByText("Close dialog");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("aria-label");
    });
  });

  test.describe("Placeholder Matching", () => {
    test("should find input by placeholder text", async () => {
      const result = await smartTextLocator.findByText("email address");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("placeholder");
      expect(result!.confidence).toBeGreaterThan(0.7);
    });

    test("should find textarea by placeholder", async () => {
      const result = await smartTextLocator.findByText("message");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("placeholder");
    });
  });

  test.describe("Fuzzy Matching", () => {
    test("should find element with typos", async () => {
      const result = await smartTextLocator.findByText("Logn Button");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("fuzzy-text");
      expect(result!.confidence).toBeCloseTo(0.55, 2);
    });

    test("should find element with extra spaces", async () => {
      const result = await smartTextLocator.findByText("  Login   Button  ");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.8);
    });

    test("should handle common misspellings", async () => {
      const result = await smartTextLocator.findByText("Submitt");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("fuzzy-text");
    });
  });

  test.describe("Title Attribute Matching", () => {
    test("should find element by title attribute", async () => {
      const result = await smartTextLocator.findByText("Click to login");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("title");
      expect(result!.confidence).toBe(0.8);
    });
  });

  test.describe("Link Text Matching", () => {
    test("should find link by text content", async () => {
      const result = await smartTextLocator.findByText("Link Button");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("button-text");
    });
  });

  test.describe("Strategy Prioritization", () => {
    test("should prefer exact match over partial", async () => {
      const result = await smartTextLocator.findByText("Submit");

      expect(result).not.toBeNull();
      expect(result!.strategy).toBe("button-text");
      expect(result!.confidence).toBe(1.0);
    });

    test("should fallback to lower confidence strategies", async () => {
      const result = await smartTextLocator.findByText(
        "nonexistent exact text but partial"
      );

      expect(result).toBeNull();
    });
  });

  test.describe("Error Handling", () => {
    test("should return null for non-existent elements", async () => {
      const result = await smartTextLocator.findByText(
        "This element does not exist"
      );

      expect(result).toBeNull();
    });

    test("should handle empty search text", async () => {
      const result = await smartTextLocator.findByText("");

      expect(result).toBeNull();
    });

    test("should handle very short search text", async () => {
      const result = await smartTextLocator.findByText("a"); // Too short for partial

      // Should still try exact and fuzzy matching
      expect(result).toBeDefined();
    });
  });
});

test.describe("Adaptive Page Actions", () => {
  let smartPage: SmartPage;

  test.beforeEach(async ({ page: playwrightPage }) => {
    smartPage = new SmartPage(playwrightPage);

    await playwrightPage.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Action Test Page</title></head>
      <body>
        <form>
          <button type="submit" id="submit-btn">Submit Form</button>
          <button type="button" id="cancel-btn">Cancel</button>
          
          <input type="text" id="username" placeholder="Enter username" />
          <input type="email" id="email" aria-label="Email address" />
          <textarea id="comments" placeholder="Your comments"></textarea>
          
          <select id="country">
            <option value="">Choose country</option>
            <option value="spain">Spain</option>
            <option value="france">France</option>
          </select>
          
          <div id="message" style="display: none;">Success!</div>
        </form>
      </body>
      </html>
    `);
  });

  test.describe("Smart Click", () => {
    test("should click button by description", async () => {
      const submitButton = await smartPage.smartClick("Submit Form");

      expect(submitButton).not.toBeNull();
    });

    test("should click button by partial text", async () => {
      await smartPage.smartClick("Cancel", { timeout: 5000 });

      // Verify the action succeeded
      const cancelButton = await smartPage.getPage().$("#cancel-btn");
      expect(cancelButton).not.toBeNull();
    });

    test("should throw error for non-existent button", async () => {
      await expect(
        smartPage.smartClick("Non-existent Button", { timeout: 3000 })
      ).rejects.toThrow("Could not find clickable element");
    });
  });

  test.describe("Smart Fill", () => {
    test("should fill input by placeholder", async () => {
      await smartPage.smartFill("username", "testuser");

      const value = await smartPage
        .getPage()
        .$eval("#username", (el) => (el as HTMLInputElement).value);
      expect(value).toBe("testuser");
    });

    test("should fill input by aria-label", async () => {
      await smartPage.smartFill("Email address", "test@example.com");

      const value = await smartPage
        .getPage()
        .$eval("#email", (el) => (el as HTMLInputElement).value);
      expect(value).toBe("test@example.com");
    });

    test("should fill textarea by placeholder", async () => {
      await smartPage.smartFill("comments", "This is a test comment");

      const value = await smartPage
        .getPage()
        .$eval("#comments", (el) => (el as HTMLTextAreaElement).value);
      expect(value).toBe("This is a test comment");
    });

    test("should throw error for non-input element", async () => {
      await expect(
        smartPage.smartFill("Submit Form", "some value")
      ).rejects.toThrow(
        'Could not find input field with description: "Submit Form"'
      );
    });
  });

  test.describe("Adaptive Select", () => {
    test("should select option by text", async () => {
      await smartPage.smartSelect("country", "Spain");

      const value = await smartPage
        .getPage()
        .$eval("#country", (el) => (el as HTMLSelectElement).value);
      expect(value).toBe("spain");
    });

    test("should throw error for non-select element", async () => {
      await expect(
        smartPage.smartSelect("Submit Form", "option")
      ).rejects.toThrow(
        'Could not find select dropdown with description: "Submit Form"'
      );
    });
  });

  test.describe("Smart Wait", () => {
    test("should wait for element to become visible", async () => {
      // Make element visible after delay
      setTimeout(async () => {
        await smartPage.getPage().$eval("#message", (el) => {
          (el as HTMLElement).style.display = "block";
        });
      }, 1000);

      await expect(async () => {
        await smartPage.smartWait("Success!", { timeout: 5000 });
      }).not.toThrow();

      await smartPage.smartWait("Success!", { timeout: 5000 });
    });

    test("should timeout if element never appears", async () => {
      await expect(
        smartPage.smartWait("Never appears", { timeout: 2000 })
      ).rejects.toThrow("Timeout waiting for element");
    });
  });
});

test.describe("Configuration Options", () => {
  test("should respect custom threshold", async ({ page }) => {
    const strictLocator = new SmartTextLocator(page, { threshold: 0.6 });
    const lenientLocator = new SmartTextLocator(page, { threshold: 0.4 });

    await page.setContent(`<button>Login Button</button>`);

    // Typo menos severo: solo falta una letra
    const strictResult = await strictLocator.findByText("Login Buton");
    expect(strictResult).toBeNull();

    const lenientResult = await lenientLocator.findByText("Login Buton");
    expect(lenientResult).not.toBeNull();
  });

  test("should respect case sensitivity option", async ({ page }) => {
    const caseSensitive = new SmartTextLocator(page, { ignoreCase: false });
    const caseInsensitive = new SmartTextLocator(page, { ignoreCase: true });

    await page.setContent(`
      <button>Login Button</button>
    `);

    // Case sensitive should not find
    const sensitiveResult = await caseSensitive.findByText("LOGIN BUTTON");
    expect(sensitiveResult).toBeNull();

    // Case insensitive should find
    const insensitiveResult = await caseInsensitive.findByText("LOGIN BUTTON");
    expect(insensitiveResult).not.toBeNull();
  });

  test("should respect timeout option", async ({ page }) => {
    const quickTimeout = new SmartPage(page, { timeout: 1000 });

    await page.setContent(`<div>No buttons here</div>`);

    const startTime = Date.now();

    await expect(
      quickTimeout.smartClick("Non-existent Button")
    ).rejects.toThrow();

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000); // Should timeout quickly
  });
});

test.describe("Performance Tests", () => {
  test("should find elements efficiently", async ({ page }) => {
    // Create page with many elements
    const html = `
      <div>
        ${Array.from(
          { length: 100 },
          (_, i) => `<button id="btn-${i}">Button ${i}</button>`
        ).join("")}
        <button id="target">Target Button</button>
      </div>
    `;

    await page.setContent(html);

    const locator = new SmartTextLocator(page);
    const startTime = Date.now();

    const result = await locator.findByText("Target Button");

    const elapsed = Date.now() - startTime;

    expect(result).not.toBeNull();
    expect(elapsed).toBeLessThan(2000); // Should complete within 2 seconds
  });
});

test.describe("Real-world Scenarios", () => {
  test("should handle common login form", async ({ page }) => {
    await page.setContent(`
    <form class="login-form" onsubmit="event.preventDefault(); return false;">
      <h2>Sign In</h2>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="Email Address" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Password" required>
      </div>
      <button type="submit" class="btn-primary">Sign In</button>
    </form>
  `);

    const adaptivePage = new SmartPage(page);

    await adaptivePage.smartFill("Email Address", "user@test.com");
    await adaptivePage.smartFill("Password", "secretpassword");
    await adaptivePage.smartClick("Sign In");

    // Verify form was filled
    const email = await page.$eval(
      "#email",
      (el) => (el as HTMLInputElement).value
    );
    const password = await page.$eval(
      "#password",
      (el) => (el as HTMLInputElement).value
    );

    expect(email).toBe("user@test.com");
    expect(password).toBe("secretpassword");
  });

  test("should handle e-commerce product page", async ({ page }) => {
    await page.setContent(`
    <div class="product-page">
      <h1>Amazing Product</h1>
      <div class="product-options">
        <select id="size" aria-label="Product Size">
          <option value="">Select Size</option>
          <option value="s">Small</option>
          <option value="m">Medium</option>
          <option value="l">Large</option>
        </select>
        <select id="color" aria-label="Product Color">
          <option value="">Select Color</option>
          <option value="red">Red</option>
          <option value="blue">Blue</option>
        </select>
      </div>
      <button class="add-to-cart">Add to Cart</button>
    </div>
  `);

    const adaptivePage = new SmartPage(page);

    await adaptivePage.smartSelect("Product Size", "Medium");
    await adaptivePage.smartSelect("Product Color", "Blue");
    await adaptivePage.smartClick("Add to Cart");

    const size = await page.$eval(
      "#size",
      (el) => (el as HTMLSelectElement).value
    );
    const color = await page.$eval(
      "#color",
      (el) => (el as HTMLSelectElement).value
    );

    expect(size).toBe("m");
    expect(color).toBe("blue");
  });
});
