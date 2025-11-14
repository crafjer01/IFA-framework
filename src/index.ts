// src/index.ts - EXPORTS PRINCIPALES
export { CognitoEngine } from "./core/CognitoEngine.js";
export { ConfigManager } from "./core/ConfigManager.js";
export { Logger } from "./core/Logger.js";
export { CognitoPageWrapper } from "./core/CognitoPageWrapper.js";
export { SmartPage } from "./core/SmartPage.js";
export { ReportingEngine } from "./core/ReportingEngine.js";
export { defineConfig } from "./cli.js";

// Export tipos (TypeScript types)
export type {
  CognitoConfigType,
  CognitoPageType,
  LogEntryType,
  TestResultType,
  TestCaseType,
  TestFunctionType,
  TestSuiteType,
  SmartLocatorOptionsType,
  LocatorResultType,
  LocatorStrategyType,
} from "./types/index.js";

// Alias para compatibilidad con nombres  CognitoPage  y  CognitoConfig
export type { CognitoPageType as CognitoPage } from "./types/index.js";
export type { CognitoConfigType as CognitoConfig } from "./types/index.js";

// Export new test runner API
export {
  test,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  getTestRegistry,
  clearTestRegistry,
} from "./core/TestRunner.js";

// Re-export Playwright's expect for assertions
export { expect } from "@playwright/test";

export async function createCognitoEngine(config: any) {
  const { CognitoEngine } = await import("./core/CognitoEngine.js");
  const engine = new CognitoEngine(config);
  await engine.initialize();
  return engine;
}
