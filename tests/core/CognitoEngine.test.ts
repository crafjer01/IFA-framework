import { test, expect } from "@playwright/test";
import { CognitoEngine } from "../../src/core/CognitoEngine";

test.describe("CognitoEngine test cases", () => {
  let engine: CognitoEngine;

  test.beforeEach(() => {
    engine = new CognitoEngine();
  });

  test.afterEach(async () => {
    if (engine) {
      await engine.close();
    }
  });

  test("should initialize successfully", async () => {
    await expect(engine.initialize()).resolves.not.toThrow();
  });

  test("should create new page", async () => {
    await engine.initialize();
    const page = await engine.newPage();
    expect(page).toBeDefined();
    expect(typeof page.goto).toBe("function");
  });

  test("should run basic test", async () => {
    await engine.initialize();

    const result = await engine.runTest(async (page) => {
      await page.setContent(
        `<h1>Test Page</h1><button id="btn">Click me</button>`
      );

      await page.click("#btn");

      await page.screenshot({ path: "../../test-results/test-screenshot.png" });
    }, "Basic navigation test");

    expect(result.status).toBe("passed");
    expect(result.name).toBe("Basic navigation test");
    expect(result.duration).toBeGreaterThan(0);
  });

  test("should handle test failures", async () => {
    await engine.initialize();

    const result = await engine.runTest(async (page) => {
      throw new Error("Test error");
    }, "Failing test");

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Test error");
  });
});
