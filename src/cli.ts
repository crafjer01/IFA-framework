// src/cli.ts - Soporte nativo para TypeScript y JavaScript
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
//import inquirer from "inquirer";
import ora from "ora";
import { glob } from "glob";
import { spawn } from "child_process";
//import { fileURLToPath } from "url";

import { IFAEngine } from "./core/IFAEngine.js";

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("ifa")
  .description("IFA Framework - AI-powered web automation testing")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new IFA project")
  .argument("[project-name]", "Project name (creates new directory)")
  .option("-t, --template <template>", "Project template", "basic")
  .action(async (projectName?: string, options?: any) => {
    await initCommand(projectName, options);
  });

program
  .command("run")
  .description("Run IFA tests")
  .option("-c, --config <path>", "Config file path")
  .option("-t, --test <pattern>", "Test file pattern", "**/*.ifa.{js,ts}")
  .option("-h, --headless", "Run in headless mode")
  .option("-d, --debug", "Enable debug mode")
  .action(async (options) => {
    await runCommand(options);
  });

program
  .command("debug")
  .description("Run a single test in debug mode")
  .argument("<testFile>", "Test file to debug")
  .action(async (testFile) => {
    await debugCommand(testFile);
  });

/**
 * Detecta si necesitamos cargar TypeScript y reinicia el proceso con tsx
 */
async function ensureTypeScriptSupport(testFiles: string[]): Promise<boolean> {
  const hasTypescriptFiles = testFiles.some((f) => f.endsWith(".ts"));

  // Si no hay archivos TS o ya estamos corriendo con tsx, continuar normal
  if (!hasTypescriptFiles || process.env.IFA_TS_LOADED === "1") {
    return true;
  }

  // Verificar si tsx está disponible
  try {
    await import("tsx");
  } catch {
    console.log(
      chalk.yellow("\n  TypeScript files detected but tsx is not installed.")
    );
    console.log(chalk.blue("Please install tsx: npm install --save-dev tsx\n"));
    return false;
  }

  // Re-ejecutar el comando con tsx
  console.log(chalk.gray("Loading TypeScript support...\n"));

  return new Promise((_resolve) => {
    // Usar tsx como loader
    const args = ["--import", "tsx", ...process.argv.slice(1)];

    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: { ...process.env, IFA_TS_LOADED: "1" },
    });

    child.on("exit", (code) => {
      process.exit(code || 0);
    });

    child.on("error", (error) => {
      console.error(
        chalk.red("Failed to start with TypeScript support:"),
        error
      );
      process.exit(1);
    });
  });
}

// Init command (sin cambios)
async function initCommand(_projectNameArg?: string, _options?: any) {
  // ... (mantener código anterior del initCommand)
  console.log(
    chalk.blue("Init command - implementation from previous artifact")
  );
}

async function runCommand(options: any) {
  const spinner = ora("Starting IFA test run...").start();

  try {
    // Encontrar archivos de test primero
    const testFiles = await findTestFiles(options.test);

    if (testFiles.length === 0) {
      spinner.stop();
      console.log(
        chalk.yellow("No test files found matching pattern:", options.test)
      );
      return;
    }

    // Verificar y cargar soporte TypeScript si es necesario
    const canContinue = await ensureTypeScriptSupport(testFiles);
    if (!canContinue) {
      spinner.stop();
      return;
    }

    // Si llegamos aquí, TypeScript está soportado (si es necesario)
    const engine = new IFAEngine({
      browser: {
        headless: options.headless || false,
        slowMo: 0,
        args: [],
        viewport: { width: 1280, height: 720 },
        userAgent: "",
        ignoreHTTPSErrors: false,
      },
      timeouts: {
        default: 0,
        navigation: 30000,
        element: 10000,
      },
      reporting: {
        html: { enabled: true, openAfter: !process.env.CI },
        allure: { enabled: false },
        custom: { enabled: false },
      },
      logging: {
        level: options.debug ? "debug" : "info",
      },
    });

    await engine.initialize();
    spinner.succeed("IFA Engine initialized");

    console.log(chalk.blue(`Found ${testFiles.length} test file(s)`));

    const results = [];

    for (const testFile of testFiles) {
      console.log(chalk.gray(`Running ${testFile}...`));
      try {
        // Importar el archivo de test directamente
        const testModule = await import(
          pathToFileURL(path.resolve(testFile)).href
        );

        if (testModule.default && typeof testModule.default === "function") {
          const page = await engine.newPage();
          await testModule.default(page);
          results.push({ name: testFile, status: "passed" });
          await page.close();
        } else {
          throw new Error(`Test file must export a default function`);
        }
      } catch (error) {
        console.error(chalk.red(`Test failed: ${testFile}`), error);
        results.push({ name: testFile, status: "failed", error });
      }
    }

    await engine.close();

    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(
      chalk.green(`\n✅ Tests completed: ${passed} passed, ${failed} failed`)
    );

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    spinner.fail("Test run failed");
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
}

async function debugCommand(testFile: string) {
  console.log(chalk.blue(`🐛 Debug mode: ${testFile}`));

  if (!(await fs.pathExists(testFile))) {
    console.error(chalk.red(`Test file not found: ${testFile}`));
    return;
  }

  // Verificar soporte TypeScript
  const canContinue = await ensureTypeScriptSupport([testFile]);
  if (!canContinue) {
    return;
  }

  const engine = new IFAEngine({
    browser: {
      headless: false,
      slowMo: 1000,
      args: [],
      viewport: { width: 1280, height: 720 },
      userAgent: "",
      ignoreHTTPSErrors: false,
    },
    timeouts: {
      default: 0,
      navigation: 30000,
      element: 10000,
    },
    reporting: {
      html: { enabled: true, openAfter: !process.env.CI },
      allure: { enabled: false },
      custom: { enabled: false },
    },
    logging: {
      level: "debug",
    },
  });

  try {
    await engine.initialize();

    const testModule = await import(pathToFileURL(path.resolve(testFile)).href);

    if (testModule.default) {
      const page = await engine.newPage();
      console.log(chalk.gray("Starting test in debug mode..."));
      await testModule.default(page);
      console.log(chalk.green("Test completed successfully!"));
    } else {
      throw new Error("Test file must export a default function");
    }
  } catch (error) {
    console.error(chalk.red("Debug session failed:"), error);
  } finally {
    await engine.close();
  }
}
/*
function generateConfig(answers: any): string {
  const features = answers.features || [];
  return `// IFA Framework Configuration
import { defineConfig } from 'ifa-framework';

export default defineConfig({
  browser: {
    headless: process.env.CI === 'true',
    viewport: { width: 1920, height: 1080 }
  },
  features: {
    aiHealing: { 
      enabled: ${features.includes("aiHealing")}, 
      learningRate: 0.8 
    },
    visualTesting: { 
      enabled: ${features.includes("visualTesting")}, 
      threshold: 0.1 
    },
    performance: { 
      enabled: ${features.includes("performance")}, 
      budgets: { lcp: 2500, fid: 100, cls: 0.1 } 
    }
  },
  reporting: {
    html: { enabled: true, openAfter: !process.env.CI },
    allure: { enabled: ${features.includes("allure")} }
  }
});`;
}

function generateExampleTest(answers: any): string {
  return `// Example IFA test
${answers.useTypeScript ? "import { IFAPage } from 'ifa-framework';" : ""}

export default async function exampleTest(page${
    answers.useTypeScript ? ": IFAPage" : ""
  }) {
  await page.goto('https://example.com');
  await page.screenshot({ path: 'ifa-results/screenshots/example.png' });
  console.log('✅ Example test completed successfully!');
}`;
}
*/
async function findTestFiles(pattern: string): Promise<string[]> {
  try {
    const files = await glob(pattern, {
      ignore: ["node_modules/**", "dist/**"],
      absolute: true,
    });
    return files;
  } catch (err) {
    console.error("Error finding test files:", err);
    throw err;
  }
}

// Helper para convertir path a URL
function pathToFileURL(filePath: string): URL {
  const url = new URL("file:///");
  url.pathname = filePath.split(path.sep).join("/");
  return url;
}

export function defineConfig(config: any) {
  return config;
}

program.parse();
