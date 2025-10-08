// src/core/ConfigManager.ts

import * as fsExtra from "fs-extra";
import { IFAConfig } from "./Types.js";

// Determinar el objeto correcto: si fsExtra tiene existsSync, lo usamos; si no, usamos fsExtra.default
const fs = (fsExtra as any).existsSync ? fsExtra : (fsExtra as any).default;

/**
 * Realiza una fusión profunda (deep merge) de dos objetos de configuración.
 * Solo fusiona objetos planos, manteniendo arrays y otros tipos intactos.
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  if (source) {
    for (const key of Object.keys(source)) {
      const targetValue = output[key];
      const sourceValue = source[key];

      // Si es un objeto (y no es null ni un array), realiza la fusión profunda.
      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        // En caso contrario, sobrescribe con el valor fuente
        output[key] = sourceValue;
      }
    }
  }
  return output;
}

export class ConfigManager {
  private static defaultConfig: IFAConfig = {
    browser: {
      headless: false,
      slowMo: 0,
      args: [],
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: false,
      userAgent: "",
    },
    timeouts: {
      default: 30000,
      navigation: 60000,
      element: 10000,
    },
    features: {
      aiHealing: {
        enabled: true,
        learningRate: 0.8,
      },
      visualTesting: {
        enabled: false,
        threshold: 0.1,
      },
      performance: {
        enabled: false,
        budgets: {
          lcp: 2500,
          fid: 100,
          cls: 0.1,
        },
      },
    },
    reporting: {
      html: { enabled: true, openAfter: false },
      allure: { enabled: false },
      custom: { enabled: false },
    },
    logging: {
      level: "info",
    },
  };

  /**
   * Loads configuration from default values, an optional 'fau.config.json' file,
   * and runtime overrides, applying deep merge.
   */
  static loadConfig(overrides?: Partial<IFAConfig>): IFAConfig {
    let finalConfig: IFAConfig = { ...this.defaultConfig };

    // 1. Check for JSON config file
    const jsonConfigPath = "fau.config.json";
    if (fs.existsSync(jsonConfigPath)) {
      try {
        const fileContent = fs.readFileSync(jsonConfigPath, "utf-8");
        const fileConfig = JSON.parse(fileContent) as Partial<IFAConfig>;

        // CORRECCIÓN: Usar deep merge para fusionar la configuración del archivo
        finalConfig = deepMerge(finalConfig, fileConfig) as IFAConfig;

        console.log("Config file fau.config.json found and loaded");
      } catch (error) {
        console.error("Error reading or parsing fau.config.json:", error);
      }
    }

    // 2. Check for JS/TS config file
    const jsConfigPath = "fau.config.js";
    const tsConfigPath = "fau.config.ts";

    if (fs.existsSync(tsConfigPath)) {
      console.log(
        "Config file fau.config.ts found but dynamic import not yet implemented"
      );
      // For .ts/.js files, we'll implement dynamic import in next sprint.
    } else if (fs.existsSync(jsConfigPath)) {
      console.log(
        "Config file fau.config.js found but dynamic import not yet implemented"
      );
      // For .ts/.js files, we'll implement dynamic import in next sprint.
    }

    // 3. Apply overrides
    if (overrides) {
      // CORRECCIÓN: Usar deep merge para fusionar los overrides
      finalConfig = deepMerge(finalConfig, overrides) as IFAConfig;
    }

    this.validateConfig(finalConfig);
    return finalConfig;
  }

  /**
   * Generates a sample configuration file (fau.config.ts) content.
   */
  static generateSampleConfig(): string {
    return `import { defineConfig } from "@fau/core/types";

export default defineConfig({
  browser: {
    headless: process.env.CI === 'true',
    viewport: { width: 1920, height: 1080 }
  },
  timeouts: {
    default: 30000,
    navigation: 60000,
    element: 10000
  },
  features: {
    aiHealing: { 
      enabled: true, 
      learningRate: 0.8 
    },
    visualTesting: { 
      enabled: true, 
      threshold: 0.1 
    },
    performance: { 
      enabled: true, 
      budgets: { 
        lcp: 2500,
        fid: 100,
        cls: 0.1
      } 
    }
  },
  reporting: {
    html: { 
      enabled: true, 
      openAfter: !process.env.CI 
    },
    allure: { 
      enabled: !!process.env.ALLURE_SERVER,
      server: process.env.ALLURE_SERVER
    }
  }
});`;
  }

  static validateConfig(config: IFAConfig): void {
    // Basic validation
    if (!config.browser || typeof config.browser.headless !== "boolean") {
      throw new Error("Invalid browser configuration");
    }

    if (!config.timeouts || config.timeouts.default <= 0) {
      throw new Error("Invalid timeout configuration");
    }

    if (config.features) {
      if (
        typeof config.features.aiHealing.enabled !== "boolean" ||
        config.features.aiHealing.learningRate <= 0
      ) {
        throw new Error("Invalid aiHealing feature configuration");
      }
    }
  }
}
