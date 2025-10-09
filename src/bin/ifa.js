#!/usr/bin/env node

// bin/ifa.js - Wrapper que detecta y carga TypeScript automáticamente

import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = join(__dirname, "..", "dist", "cli.js");

// Verificar si el CLI existe
if (!existsSync(cliPath)) {
  console.error("IFA CLI not found. Please run: npm run build");
  process.exit(1);
}

// Detectar si estamos en un proyecto con TypeScript
function needsTypeScriptSupport() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  const hasTestArg = args.some(
    (arg) => arg.endsWith(".ts") || arg.includes("*.ts")
  );
  const hasTsConfig = existsSync(join(cwd, "tsconfig.json"));
  const testPatterns = args.find((arg) => arg.includes("*.ifa."));
  const defaultPattern = testPatterns || "**/*.ifa.{js,ts}";
  const probablyHasTS = defaultPattern.includes(".ts");
  const isTSLoaded = process.env.IFA_TS_LOADED === "1";

  return (
    (hasTestArg || hasTsConfig || probablyHasTS) &&
    !isTSLoaded &&
    !!getTsxPath()
  );
}

/**
 * Función que busca y devuelve la ruta absoluta del módulo tsx.
 */
function getTsxPath() {
  const cwd = process.cwd();
  
  // 1. Verificar en node_modules del proyecto
  const tsxInProject = join(cwd, "node_modules", "tsx", "dist", "esm", "index.mjs");
  if (existsSync(tsxInProject)) {
    return tsxInProject;
  }

  // 2. Verificar en node_modules del framework
  const tsxInFramework = join(__dirname, "..", "node_modules", "tsx", "dist", "esm", "index.mjs");
  if (existsSync(tsxInFramework)) {
    return tsxInFramework;
  }

  return null;
}

// Función principal
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Ejecución estándar (init, o run sin archivos TS)
  if (
    command === "init" ||
    (command !== "run" && command !== "debug") ||
    !needsTypeScriptSupport()
  ) {
    const child = spawn(process.execPath, [cliPath, ...args], {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    child.on("exit", (code) => process.exit(code || 0));
    child.on("error", (error) => {
      console.error("Failed to start IFA CLI:", error.message);
      process.exit(1);
    });
    return;
  }
  // Ejecución con soporte de TypeScript
  else {
    const tsxPath = getTsxPath();

    if (!tsxPath) {
      console.log("\n⚠️  TypeScript files detected but tsx is not installed.");
      console.log("📦 Install tsx to run TypeScript tests directly:");
      console.log("   npm install --save-dev tsx\n");
      console.log("Or compile your tests first:");
      console.log("   npm run build\n");
      process.exit(1);
    }

    // Convertir ruta a URL file:// (importante para Windows)
    const tsxURL = pathToFileURL(tsxPath).href;

    // Detectar versión de Node
    const nodeVersion = process.versions.node.split(".").map(Number);
    const [major, minor] = nodeVersion;
    const supportsImport =
      (major === 20 && minor >= 6) ||
      major > 20 ||
      (major === 18 && minor >= 19);
    const loaderFlag = supportsImport ? "--import" : "--loader";

    console.log(`🔧 Loading TypeScript support (${loaderFlag})...`);

    const child = spawn(
      process.execPath,
      [loaderFlag, tsxURL, cliPath, ...args],
      {
        stdio: "inherit",
        env: { ...process.env, FORCE_COLOR: "1", IFA_TS_LOADED: "1" },
      }
    );

    child.on("exit", (code) => process.exit(code || 0));
    child.on("error", (error) => {
      console.error("Failed to start with TypeScript support:", error.message);
      console.error("\nTry installing tsx:");
      console.error("  npm install --save-dev tsx\n");
      process.exit(1);
    });
  }
}

main();