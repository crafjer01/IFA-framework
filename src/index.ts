export { IFAEngine } from "./core/IFAEngine.js";
export { ConfigManager } from "./core/ConfigManager.js";
export { Logger } from "./core/Logger.js";
export { IFAPageWrapper } from "./core/IFAPageWrapper.js";
export { ReportingEngine } from "./core/ReportingEngine.js";
export { defineConfig } from "./cli.js";
export * from "./core/Types.js";

export async function createFauEngine(config: any) {
  const { IFAEngine } = await import("./core/IFAEngine.js");
  const engine = new IFAEngine(config);
  await engine.initialize();
  return engine;
}
