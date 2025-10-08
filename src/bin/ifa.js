#!/usr/bin/env node

// bin/ifa.js - Wrapper que detecta y carga TypeScript automáticamente

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";
import { existsSync } from "fs";

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

  // Buscar archivos .ts en los argumentos
  const args = process.argv.slice(2);
  const hasTestArg = args.some(
    (arg) => arg.endsWith(".ts") || arg.includes("*.ts")
  );

  // O si hay un tsconfig.json
  const hasTsConfig = existsSync(join(cwd, "tsconfig.json"));

  // O si hay archivos .ifa.ts
  const testPatterns = args.find((arg) => arg.includes("*.ifa."));
  const defaultPattern = testPatterns || "**/*.ifa.{js,ts}";
  const probablyHasTS = defaultPattern.includes(".ts");

  return hasTestArg || (hasTsConfig && probablyHasTS);
}

// Verificar si tsx está instalado
function isTsxAvailable() {
  try {
    const cwd = process.cwd();
    const tsxInProject = existsSync(join(cwd, "node_modules", "tsx"));
    const tsxInFramework = existsSync(
      join(__dirname, "..", "node_modules", "tsx")
    );
    return tsxInProject || tsxInFramework;
  } catch {
    return false;
  }
}

// Función principal
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Init no necesita TypeScript support
  if (command === "init") {
    const child = spawn(process.execPath, [cliPath, ...args], {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  // Para run/debug, verificar si necesitamos TypeScript
  if ((command === "run" || command === "debug") && needsTypeScriptSupport()) {
    if (!isTsxAvailable()) {
      console.log("\nTypeScript files detected but tsx is not installed.");
      console.log("Install tsx to run TypeScript tests directly:");
      console.log("   npm install --save-dev tsx\n");
      console.log("Or compile your tests first:");
      console.log("   npm run build\n");
      process.exit(1);
    }

    // Ejecutar con tsx
    // Detectar versión de Node para usar el flag correcto
    const nodeVersion = process.versions.node.split(".").map(Number);
    const [major, minor] = nodeVersion;

    // Node 20.6+ y 18.19+ soportan --import
    const supportsImport =
      (major === 20 && minor >= 6) ||
      major > 20 ||
      (major === 18 && minor >= 19);
    const loaderFlag = supportsImport ? "--import" : "--loader";

    const child = spawn(
      process.execPath,
      [loaderFlag, "tsx", cliPath, ...args],
      {
        stdio: "inherit",
        env: { ...process.env, FORCE_COLOR: "1", IFA_TS_LOADED: "1" },
      }
    );

    child.on("exit", (code) => process.exit(code || 0));
    child.on("error", (error) => {
      console.error("Failed to start with TypeScript support:", error);
      process.exit(1);
    });
  } else {
    // Ejecutar normalmente sin tsx
    const child = spawn(process.execPath, [cliPath, ...args], {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    child.on("exit", (code) => process.exit(code || 0));
  }
}

main();
