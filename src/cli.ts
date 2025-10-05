import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import { glob } from "glob";

import { FauEngine } from "./core/FauEngine.js";

const program = new Command();

program
  .name("fau")
  .description("FAU Framework - AI-powered web automation testing")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new FAU project")
  .option("-t, --template <template>", "Project template", "basic")
  .action(async () => {
    await initCommand();
  });

program
  .command("run")
  .description("Run FAU tests")
  .option("-c, --config <path>", "Config file path")
  .option("-t, --test <pattern>", "Test file pattern", "**/*.fau.{js,ts}")
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

// Funciones de comando
async function initCommand() {
  try {
    // Collect all answers from the user first
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Project name:",
        default: path.basename(process.cwd()),
      },
      {
        type: "confirm",
        name: "useTypeScript",
        message: "Use TypeScript?",
        default: true,
      },
      {
        type: "checkbox",
        name: "features",
        message: "Select features to enable:",
        choices: [
          { name: "AI Healing", value: "aiHealing", checked: true },
          { name: "Visual Testing", value: "visualTesting" },
          { name: "Performance Monitoring", value: "performance" },
          { name: "Allure Reporting", value: "allure" },
        ],
      },
    ]);

    // Now, start the spinner to indicate work is being done
    const spinner = ora(
      chalk.blue("Starting FAU project initialization...")
    ).start();

    spinner.text = "Creating project structure...";

    await fs.ensureDir("tests");
    await fs.ensureDir("fau-results");
    await fs.ensureDir("fau-results/screenshots");
    await fs.ensureDir("fau-results/reports");

    const configContent = generateConfig(answers);
    const configPath = answers.useTypeScript
      ? "fau.config.ts"
      : "fau.config.js";
    await fs.writeFile(configPath, configContent);

    if (!(await fs.pathExists("package.json"))) {
      const packageJson: {
        name: string;
        version: string;
        type: string;
        scripts: { [key: string]: string };
        devDependencies: { [key: string]: string };
      } = {
        name: answers.projectName,
        version: "1.0.0",
        type: "module",
        scripts: {
          test: "fau run",
          "test:debug": "fau debug",
          "test:headless": "fau run --headless",
        },
        devDependencies: {
          "fau-framework": "^0.1.0",
        },
      };

      if (answers.useTypeScript) {
        packageJson.devDependencies["typescript"] = "^5.0.0";
        packageJson.devDependencies["@types/node"] = "^20.0.0";
      }

      await fs.writeJSON("package.json", packageJson, { spaces: 2 });
    }

    const testContent = generateExampleTest(answers);
    const testPath = answers.useTypeScript
      ? "tests/example.fau.ts"
      : "tests/example.fau.js";
    await fs.writeFile(testPath, testContent);

    const gitignoreContent = `node_modules/
fau-results/
*.log
.env
dist/`;
    await fs.writeFile(".gitignore", gitignoreContent);

    spinner.succeed(chalk.green("FAU project initialized successfully!"));
    console.log(chalk.blue("\nNext steps:"));
    console.log("1. npm install");
    console.log("2. fau run");
    console.log("3. Check the example test in", chalk.cyan(testPath));
  } catch (error) {
    const spinner = ora(); // Initialize a dummy spinner to use fail()
    spinner.fail("Failed to initialize project");
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
}

async function runCommand(options: any) {
  const spinner = ora("Starting FAU test run...").start();

  try {
    const engine = new FauEngine({
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
    spinner.succeed("FAU Engine initialized");

    const testFiles = await findTestFiles(options.test);

    if (testFiles.length === 0) {
      console.log(
        chalk.yellow("No test files found matching pattern:", options.test)
      );
      return;
    }

    console.log(chalk.blue(`Found ${testFiles.length} test file(s)`));

    const results = [];
    for (const testFile of testFiles) {
      console.log(chalk.gray(`Running ${testFile}...`));
      try {
        const testModule = await import("file://" + path.resolve(testFile));
        if (testModule.default) {
          const page = await engine.newPage();
          await testModule.default(page);
          results.push({ name: testFile, status: "passed" });
          await page.close();
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

  const engine = new FauEngine({
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

    if (await fs.pathExists(testFile)) {
      const testModule = await import("file://" + path.resolve(testFile));
      if (testModule.default) {
        const page = await engine.newPage();
        console.log(chalk.gray("Starting test in debug mode..."));
        await testModule.default(page);
        console.log(chalk.green("Test completed successfully!"));
      }
    } else {
      console.error(chalk.red(`Test file not found: ${testFile}`));
    }
  } catch (error) {
    console.error(chalk.red("Debug session failed:"), error);
  } finally {
    await engine.close();
  }
}

function generateConfig(answers: any): string {
  const features = answers.features || [];
  return `// FAU Framework Configuration
import { defineConfig } from 'fau-framework';

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
  return `// Example FAU test
${answers.useTypeScript ? "import { FauPage } from 'fau-framework';" : ""}

export default async function exampleTest(page${
    answers.useTypeScript ? ": FauPage" : ""
  }) {
  // Navigate to a page
  await page.goto('https://example.com');
  
  // Take a screenshot for evidence
  await page.screenshot({ path: 'fau-results/screenshots/example.png' });
  
  console.log('✅ Example test completed successfully!');
}`;
}

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

export function defineConfig(config: any) {
  return config;
}

program.parse();
