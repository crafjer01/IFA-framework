// scripts/setup-ts-loader.js
// Este script configura el soporte de TypeScript para IFA

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detecta si tsx está disponible
 */
function isTsxAvailable() {
  try {
    const tsxPath = path.join(process.cwd(), "node_modules", "tsx");
    return fs.existsSync(tsxPath);
  } catch {
    return false;
  }
}

/**
 * Ejecuta el CLI de IFA con soporte de TypeScript
 */
export function runWithTypeScriptSupport(cliPath, args) {
  if (!isTsxAvailable()) {
    console.error(
      "tsx is not installed. Please run: npm install --save-dev tsx"
    );
    process.exit(1);
  }

  // Node.js 18.19+ y 20.6+ soportan --import
  // Versiones anteriores usan --loader
  const nodeVersion = process.versions.node.split(".").map(Number);
  const [major, minor] = nodeVersion;

  const useImport =
    (major === 20 && minor >= 6) || major > 20 || (major === 18 && minor >= 19);
  const loaderFlag = useImport ? "--import" : "--loader";

  const child = spawn(process.execPath, [loaderFlag, "tsx", cliPath, ...args], {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  child.on("exit", (code) => process.exit(code || 0));
  child.on("error", (error) => {
    console.error("Failed to start IFA with TypeScript support:", error);
    process.exit(1);
  });
}

// Si se ejecuta directamente
if (process.argv[1] === __filename) {
  const cliPath = process.argv[2];
  const args = process.argv.slice(3);
  runWithTypeScriptSupport(cliPath, args);
}
