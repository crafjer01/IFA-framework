// tests/core/locators/AriaLocators.test.ts
import { test, expect, Page } from "@playwright/test";
import { SmartPage } from "../../../src/core/SmartPage";
import { SmartTextLocator } from "../../../src/core/locators/SmartTextLocator";

test.describe("ARIA-based Locators", () => {
  let page: Page;
  let smartTextLocator: SmartTextLocator;
  let smartPage: SmartPage;

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = playwrightPage;
    smartTextLocator = new SmartTextLocator(page);
    smartPage = new SmartPage(page, {
      timeout: 10000,
      maxRetries: 2,
    });
  });

  test.describe("ARIA Role Syntax", () => {
    test.beforeEach(async () => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <body>
          <!-- Explicit ARIA roles -->
          <div role="button" aria-label="Submit the form">Submit</div>
          <div role="textbox" aria-label="Email address input">Email</div>
          <div role="alert" aria-label="Success message">Operation completed</div>
          
          <!-- Implicit roles -->
          <button aria-label="Login button">Login</button>
          <input type="text" aria-label="Username field" placeholder="Username" />
          <input type="email" placeholder="Enter your email address" />
          
          <!-- ARIA labelledby -->
          <label id="email-label">Email Address</label>
          <input type="email" aria-labelledby="email-label" />
          
          <!-- ARIA describedby -->
          <label id="password-label">Password</label>
          <span id="password-help">Must be at least 8 characters</span>
          <input type="password" aria-labelledby="password-label" aria-describedby="password-help" />
        </body>
        </html>
      `);
    });

    test("should find button by role syntax", async () => {
      const result = await smartTextLocator.findByText("button[submit]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch(/aria-role/);
      expect(result!.confidence).toBeGreaterThan(0.7);
    });

    test("should find textbox by role syntax", async () => {
      const result = await smartTextLocator.findByText("textbox[email]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch(/aria-role|implicit-aria-role/);
      expect(result!.confidence).toBeGreaterThan(0.7);
    });

    test("should find alert by role syntax", async () => {
      const result = await smartTextLocator.findByText("alert[success]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch(/aria-role/);
      expect(result!.matchedText).toContain("alert[success]");
    });

    test("should find element by aria-labelledby", async () => {
      const result = await smartTextLocator.findByText(
        "textbox[Email Address]"
      );

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch(/aria-role|implicit-aria-role/);
    });

    test("should fallback to text content", async () => {
      const result = await smartTextLocator.findByText("button[Login]");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.5);
    });
  });

  test.describe("Implicit ARIA Roles", () => {
    test.beforeEach(async () => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <body>
          <button>Submit Form</button>
          <input type="text" placeholder="Username" />
          <input type="email" placeholder="Email Address" />
          <input type="password" placeholder="Password" />
          <textarea placeholder="Enter your message"></textarea>
          <a href="/login">Login Link</a>
          <input type="checkbox" id="terms" />
          <input type="radio" name="option" id="opt1" />
          <h1>Main Heading</h1>
          <ul><li>Item 1</li></ul>
        </body>
        </html>
      `);
    });

    test("should find button by implicit role", async () => {
      const result = await smartTextLocator.findByText("button[Submit Form]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-exact");
    });

    test("should find textbox by implicit role", async () => {
      const result = await smartTextLocator.findByText("textbox[Username]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-exact");
    });

    test("should find link by implicit role", async () => {
      const result = await smartTextLocator.findByText("link[Login]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-partial");
    });

    test("should find heading by implicit role", async () => {
      const result = await smartTextLocator.findByText("heading[Main Heading]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-exact");
    });
  });

  test.describe("SmartPage Integration", () => {
    test.beforeEach(async () => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <body>
          <form onsubmit="event.preventDefault(); return false;">
            <div role="button" aria-label="Submit the form" onclick="alert('clicked')">Submit</div>
            <input type="email" aria-label="Email address field" id="email" />
            <div role="alert" id="alert-msg" style="display: none;">Success message</div>
            <button type="button" onclick="document.getElementById('alert-msg').style.display='block'">
              Show Alert
            </button>
          </form>
        </body>
        </html>
      `);
    });

    test("should click button with role syntax", async () => {
      await smartPage.smartClick("button[submit form]");

      // Verify the element exists
      const button = await page.$('[role="button"][aria-label*="Submit"]');
      expect(button).not.toBeNull();
    });

    test("should fill textbox with role syntax", async () => {
      await smartPage.smartFill("textbox[email address]", "test@email.com");

      const value = await page.$eval(
        "#email",
        (el) => (el as HTMLInputElement).value
      );
      expect(value).toBe("test@email.com");
    });

    test("should wait for alert with role syntax", async () => {
      // Click button to show alert
      await page.click('button[type="button"]');

      // Wait for alert
      await smartPage.smartWait("alert[success message]", { timeout: 5000 });

      // Verify alert is visible
      const alertVisible = await page.isVisible('[role="alert"]');
      expect(alertVisible).toBe(true);
    });
  });

  test.describe("ARIA Attributes Combination", () => {
    test.beforeEach(async () => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <body>
          <!-- Multiple ARIA attributes -->
          <label id="name-label">Full Name</label>
          <span id="name-help">First and last name</span>
          <input 
            type="text" 
            role="textbox"
            aria-label="User full name"
            aria-labelledby="name-label"
            aria-describedby="name-help"
          />
          
          <!-- Button with multiple attributes -->
          <button 
            role="button"
            aria-label="Primary action button"
            aria-describedby="btn-help"
          >
            Save Changes
          </button>
          <span id="btn-help">This will save all your changes</span>
        </body>
        </html>
      `);
    });

    test("should prioritize aria-label over labelledby", async () => {
      const result = await smartTextLocator.findByText(
        "textbox[User full name]"
      );

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch(/aria-role/);
    });

    test("should fallback to labelledby when aria-label doesn't match", async () => {
      const result = await smartTextLocator.findByText("textbox[Full Name]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-exact");
    });

    test("should use describedby as additional info", async () => {
      const result = await smartTextLocator.findByText(
        "textbox[First and last name]"
      );

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch(/describedby/);
    });
  });

  test.describe("Fallback Strategies", () => {
    test.beforeEach(async () => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <body>
          <!-- Element without ARIA but with role syntax search -->
          <button id="plain-btn">Plain Button</button>
          <input type="text" id="plain-input" placeholder="Plain Input" />
          
          <!-- Mixed scenarios -->
          <div role="button">No Label Button</div>
          <div role="textbox" contenteditable="true">Editable Content</div>
        </body>
        </html>
      `);
    });

    test("should fallback to implicit role for plain button", async () => {
      const result = await smartTextLocator.findByText("button[Plain Button]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-exact");
    });

    test("should fallback to placeholder for plain input", async () => {
      const result = await smartTextLocator.findByText("textbox[Plain Input]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-exact");
    });

    test("should fallback to text content when no ARIA", async () => {
      const result = await smartTextLocator.findByText("button[No Label]");

      expect(result).not.toBeNull();
      expect(result!.strategy).toMatch("aria-role-native-partial");
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle invalid role syntax gracefully", async () => {
      await page.setContent(`<button>Normal Button</button>`);

      // Missing closing bracket
      const result1 = await smartTextLocator.findByText("button[incomplete");
      expect(result1).toBeNull();

      // No role specified
      const result2 = await smartTextLocator.findByText("[just description]");
      expect(result2).toBeNull();
    });

    test("should handle unknown ARIA roles", async () => {
      await page.setContent(`
        <div role="unknownrole" aria-label="Test">Content</div>
      `);

      const result = await smartTextLocator.findByText("unknownrole[Test]");

      // Should try explicit role even if not in implicit map
      expect(result).not.toBeNull();
    });

    test("should handle case insensitive role matching", async () => {
      await page.setContent(`
        <button aria-label="Submit Form">Submit</button>
      `);

      const result = await smartTextLocator.findByText("BUTTON[submit]");

      expect(result).not.toBeNull();
    });

    test("should prefer exact matches over partial", async () => {
      await page.setContent(`
        <div role="button" aria-label="Submit">Submit Button</div>
        <div role="button" aria-label="Submit Form">Submit</div>
      `);

      const result = await smartTextLocator.findByText("button[Submit Form]");

      expect(result).not.toBeNull();
      expect(result!.matchedText).toContain("Submit Form");
    });
  });

  test.describe("Real-world Complex Forms", () => {
    test("should handle complete registration form", async () => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <body>
          <form>
            <h2>Registration Form</h2>
            
            <label id="fname-label">First Name</label>
            <input type="text" aria-labelledby="fname-label" id="fname" />
            
            <label id="email-label">Email Address</label>
            <input type="email" aria-labelledby="email-label" id="email" />
            
            <label id="pwd-label">Password</label>
            <span id="pwd-help">At least 8 characters</span>
            <input 
              type="password" 
              aria-labelledby="pwd-label" 
              aria-describedby="pwd-help"
              id="password"
            />
            
            <div role="group" aria-labelledby="terms-label">
              <span id="terms-label">Terms and Conditions</span>
              <input type="checkbox" id="terms" aria-label="Accept terms" />
              <label for="terms">I accept the terms</label>
            </div>
            
            <button type="submit" aria-label="Register new account">Register</button>
          </form>
        </body>
        </html>
      `);

      const smartPage = new SmartPage(page);

      // Fill form using ARIA role syntax
      await smartPage.smartFill("textbox[First Name]", "John");
      await smartPage.smartFill("textbox[Email Address]", "john@example.com");
      await smartPage.smartFill("textbox[Password]", "SecurePass123");
      await smartPage.smartClick("checkbox[Accept terms]");
      // await smartPage.smartClick("button[Register]");

      // Verify all fields were filled
      const fname = await page.inputValue("#fname");
      const email = await page.inputValue("#email");
      const password = await page.inputValue("#password");
      const termsChecked = await page.isChecked("#terms");

      expect(fname).toBe("John");
      expect(email).toBe("john@example.com");
      expect(password).toBe("SecurePass123");
      expect(termsChecked).toBe(true);
    });
  });
});
