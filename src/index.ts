export { CognitoEngine } from "./core/CognitoEngine.js";
export { ConfigManager } from "./core/ConfigManager.js";
export { Logger } from "./core/Logger.js";
export { CognitoPageWrapper } from "./core/CognitoPageWrapper.js";
export { ReportingEngine } from "./core/ReportingEngine.js";
export { defineConfig } from "./cli.js";
export * from "./core/Types.js";

// Export new test runner API
export {
  test,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect,
  getTestRegistry,
  clearTestRegistry,
} from "./core/TestRunner.js";

export type { TestFunction, TestCase, TestSuite } from "./core/TestRunner.js";

export async function createFauEngine(config: any) {
  const { CognitoEngine } = await import("./core/CognitoEngine.js");
  const engine = new CognitoEngine(config);
  await engine.initialize();
  return engine;
}
