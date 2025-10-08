import { test, expect } from "@playwright/test";
import { ConfigManager } from "../../src/core/ConfigManager";
import * as fsExtra from "fs-extra";

const fs = (fsExtra as any).existsSync ? fsExtra : (fsExtra as any).default;

test.describe("ConfigManager", () => {
  test.afterEach(() => {
    // Clean up test config files
    const testFiles = ["fau.config.json", "fau.config.js"];
    testFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.removeSync(file);
      }
    });
  });

  test("should load default config", () => {
    const config = ConfigManager.loadConfig();
    expect(config.browser.headless).toBe(false);
    expect(config.features!.aiHealing.enabled).toBe(true);
    expect(config.timeouts.default).toBe(30000);
  });

  test("should merge override config", () => {
    const config = ConfigManager.loadConfig({
      browser: { headless: true } as any,
    });
    expect(config.browser.headless).toBe(true);
    expect(config.timeouts.default).toBe(30000);
  });

  test("should load from JSON file", () => {
    const testConfig = {
      browser: { headless: true },
      features: { aiHealing: { enabled: false } },
    };

    fs.writeFileSync("fau.config.json", JSON.stringify(testConfig));

    const config = ConfigManager.loadConfig();
    expect(config.browser.headless).toBe(true);
    expect(config.features!.aiHealing.enabled).toBe(false);
  });

  test("should validate config", () => {
    expect(() => {
      ConfigManager.validateConfig({
        features: { aiHealing: { learningRate: 1.5 } },
      } as any);
    }).toThrow("Invalid browser configuration");
  });
});
