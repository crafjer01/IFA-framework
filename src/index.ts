export { FauEngine } from "./core/FauEngine.js";
export { ConfigManager } from "./core/ConfigManager.js";
export { Logger } from "./core/Logger.js";
export { FauPageWrapper } from "./core/FauPageWrapper.js";
export { ReportingEngine } from "./core/ReportingEngine.js";
export { defineConfig } from "./cli.js";
export * from "./core/Types.js";

export async function createFauEngine(config: any) {
  const { FauEngine } = await import("./core/FauEngine.js");
  const engine = new FauEngine(config);
  await engine.initialize();
  return engine;
}
