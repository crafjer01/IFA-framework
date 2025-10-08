#!/usr/bin/env node

// bin/ifa.js - Wrapper que detecta y carga TypeScript automáticamente

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { execa } from "execa"; // 🎯 Importar execa

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
async function main() {
  // 🎯 Hacer la función principal asíncrona para usar await
  const args = process.argv.slice(2);
  const command = args[0];

  const execArgs = [cliPath, ...args];
  const execEnv = { ...process.env, FORCE_COLOR: "1" };

  try {
    if (command === "init" || (command !== "run" && command !== "debug")) {
      // Ejecutar INIT o comandos sin TSX directamente
      // 🎯 Usar execa para ejecutar node con la ruta al cli.js
      await execa(process.execPath, execArgs, {
        stdio: "inherit",
        env: execEnv,
      });
    }
    // ... (Tu lógica de 'run' y 'debug' con tsx)
    else if (
      (command === "run" || command === "debug") &&
      needsTypeScriptSupport()
    ) {
      // ... lógica de detección de tsx ...
      // Ejecutar con tsx (ajustar execa aquí también)
      // ...
    } else {
      // Ejecutar normalmente sin tsx
      await execa(process.execPath, execArgs, {
        stdio: "inherit",
        env: execEnv,
      });
    }
  } catch (error) {
    console.error("IFA CLI execution failed:", error.message);
    process.exit(error.exitCode || 1);
  }
}

main();
