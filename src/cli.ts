// src/cli.ts - IMPROVED VERSION
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import { glob } from "glob";
import { CognitoEngine } from "./core/CognitoEngine.js";
import { pathToFileURL } from "url";
import { spawn } from "child_process";
import { getTestRegistry, clearTestRegistry } from "./core/TestRunner.js";

const program = new Command();

program
  .name("cognito")
  .description("Cognito Framework - AI-powered web automation testing")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new Cognito project")
  .argument("[project-name]", "Project name (creates new directory)")
  .option("-t, --template <template>", "Project template", "basic")
  .action(async (projectName?: string, options?: any) => {
    await initCommand(projectName, options);
  });

program
  .command("run")
  .description("Run Cognito tests")
  .option("-c, --config <path>", "Config file path")
  .option("-t, --test <pattern>", "Test file pattern", "**/*.cognito.{js,ts}")
  .option("-h, --headless", "Run in headless mode")
  .option("-d, --debug", "Enable debug mode")
  .option("--grep <pattern>", "Only run tests matching pattern")
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

// IMPROVED init command - creates complete project structure
async function initCommand(projectNameArg?: string, _options?: any) {
  const spinner = ora();

  try {
    // Ask for project details
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Project name:",
        default: projectNameArg || "my-cognito-project",
        when: !projectNameArg,
      },
      {
        type: "confirm",
        name: "createDirectory",
        message: "Create new directory for project?",
        default: true,
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
      {
        type: "list",
        name: "packageManager",
        message: "Package manager:",
        choices: ["npm", "yarn", "pnpm"],
        default: "npm",
      },
    ]);

    const projectName = projectNameArg || answers.projectName;
    const projectPath = answers.createDirectory
      ? path.join(process.cwd(), projectName)
      : process.cwd();

    // Check if directory exists
    if (answers.createDirectory && (await fs.pathExists(projectPath))) {
      const overwrite = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `Directory ${projectName} already exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!overwrite.overwrite) {
        console.log(chalk.yellow("Project initialization cancelled."));
        return;
      }
      await fs.remove(projectPath);
    }

    spinner.start(chalk.blue("Creating Cognito project structure..."));

    // Create project directory
    await fs.ensureDir(projectPath);

    // Create complete directory structure
    const directories = [
      "tests/examples",
      "src//pages/examples",
      "src/utils",
      "cognito-results/screenshots",
      "cognito-results/reports",
      "cognito-results/videos",
      ".github/workflows",
      ".vscode",
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(projectPath, dir));
    }

    spinner.text = "Creating configuration files...";

    // 1. package.json
    await fs.writeJSON(
      path.join(projectPath, "package.json"),
      generatePackageJson(projectName, answers),
      { spaces: 2 }
    );

    // 2. tsconfig.json or jsconfig.json
    if (answers.useTypeScript) {
      await fs.writeJSON(
        path.join(projectPath, "tsconfig.json"),
        generateTsConfig(),
        { spaces: 2 }
      );
    } else {
      await fs.writeJSON(
        path.join(projectPath, "jsconfig.json"),
        generateJsConfig(),
        { spaces: 2 }
      );
    }

    // 3. Cognito config
    const configContent = generateConfig(answers);
    const configPath = path.join(
      projectPath,
      answers.useTypeScript ? "cognito.config.ts" : "cognito.config.js"
    );
    await fs.writeFile(configPath, configContent);

    // 4. .gitignore
    await fs.writeFile(
      path.join(projectPath, ".gitignore"),
      generateGitignore()
    );

    // 5. README.md
    await fs.writeFile(
      path.join(projectPath, "README.md"),
      generateReadme(projectName, answers)
    );

    // 6. Example tests
    await createExampleTests(projectPath, answers);

    // 7. VS Code configuration
    await createVSCodeConfig(projectPath);

    // 8. GitHub Actions workflow
    await createGithubWorkflow(projectPath, answers);

    // 9. .env.example
    await fs.writeFile(
      path.join(projectPath, ".env.example"),
      generateEnvExample()
    );

    spinner.succeed(chalk.green("Cognito project structure created!"));

    // Show next steps
    console.log(chalk.blue("\nNext steps:\n"));

    if (answers.createDirectory) {
      console.log(chalk.cyan(`  cd ${projectName}`));
    }

    const installCmd =
      answers.packageManager === "npm"
        ? "npm install"
        : answers.packageManager === "yarn"
        ? "yarn"
        : "pnpm install";

    console.log(chalk.cyan(`  ${installCmd}`));
    console.log(chalk.cyan(`  npx playwright install`));
    console.log(chalk.cyan(`  ${answers.packageManager} test`));

    console.log(chalk.blue("\nProject structure:"));
    console.log(
      chalk.gray(`
  ${projectName}/
  ├── src/
  │   ├── tests/           # Your test files
  │   ├── pages/           # Page Object Models
  │   └── utils/           # Utility functions
  ├── cognito-results/     # Test results and reports
  ├── cognito.config.ts    # Cognito configuration
  ├── package.json
  └── README.md
    `)
    );

    console.log(chalk.green("\nProject initialized successfully!\n"));
  } catch (error) {
    spinner.fail("Failed to initialize project");
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
}

// ============================================
// RUN COMMAND - UPDATED FOR test() API
// ============================================
async function runCommand(options: any) {
  const spinner = ora().start();

  try {
    const testFiles = await findTestFiles(options.test);

    if (testFiles.length === 0) {
      spinner.stop();
      console.log(
        chalk.yellow("No test files found matching pattern:", options.test)
      );
      return;
    }

    const canContinue = await ensureTypeScriptSupport(testFiles);
    if (!canContinue) {
      spinner.stop();
      return;
    }

    const engine = new CognitoEngine({
      browser: {
        headless: options.headless || false,
        slowMo: 0,
        args: [],
        viewport: { width: 1280, height: 720 },
        userAgent: "",
        ignoreHTTPSErrors: false,
      },
      timeouts: {
        default: 30000,
        navigation: 60000,
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
    spinner.succeed("Cognito Tests initialized");

    console.log(chalk.blue(`\n📁 Found ${testFiles.length} test file(s)\n`));

    const allResults: any[] = [];

    for (const testFile of testFiles) {
      console.log(chalk.gray(`📄 Loading: ${path.basename(testFile)}`));

      // Clear registry before each file
      clearTestRegistry();

      try {
        // Import the test file (this registers tests via test() calls)
        await import(pathToFileURL(path.resolve(testFile)).href);

        // Get all registered tests
        const registry = getTestRegistry();
        const testsToRun = registry.getTestsToRun();

        if (testsToRun.length === 0) {
          console.log(
            chalk.yellow(`No tests found in ${path.basename(testFile)}`)
          );
          continue;
        }

        // Filter by grep pattern if provided
        const filteredTests = options.grep
          ? testsToRun.filter((t) => t.name.includes(options.grep))
          : testsToRun;

        if (filteredTests.length === 0) {
          console.log(chalk.yellow(`No tests match pattern: ${options.grep}`));
          continue;
        }

        console.log(
          chalk.blue(`  Running ${filteredTests.length} test(s)...\n`)
        );

        // Run each test
        for (const test of filteredTests) {
          const startTime = Date.now();

          try {
            const page = await engine.newPage();

            await test.fn(page);

            const duration = Date.now() - startTime;
            //console.log(chalk.gray(`${test.name} passed - (${duration}ms)`));
            spinner.succeed(`${test.name} passed - (${duration}ms)`);

            allResults.push({
              name: test.name,
              file: testFile,
              status: "passed",
              duration,
            });

            await page.close();
          } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error(chalk.red(`  ❌ ${test.name} (${duration}ms)`));
            console.error(chalk.red(`     ${error.message}`));

            allResults.push({
              name: test.name,
              file: testFile,
              status: "failed",
              duration,
              error: error.message,
              stack: error.stack,
            });
          }
        }

        console.log(); // Empty line between files
      } catch (error: any) {
        console.error(
          chalk.red(`  ❌ Failed to load test file: ${error.message}`)
        );
        allResults.push({
          name: path.basename(testFile),
          file: testFile,
          status: "failed",
          error: error.message,
        });
      }
    }

    await engine.close();

    // Print summary
    const passed = allResults.filter((r) => r.status === "passed").length;
    const failed = allResults.filter((r) => r.status === "failed").length;
    const total = allResults.length;

    console.log(chalk.blue("━".repeat(60)));
    console.log(chalk.bold("\n📊 Test Summary\n"));
    console.log(chalk.green(`  ✅ Passed: ${passed}/${total}`));
    console.log(chalk.red(`  ❌ Failed: ${failed}/${total}`));

    if (failed > 0) {
      console.log(chalk.red("\n❌ Some tests failed\n"));
      process.exit(1);
    } else {
      console.log(chalk.green("\n✅ All tests passed!\n"));
    }
  } catch (error) {
    spinner.fail("Test run failed");
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
}
// ============================================
// DEBUG COMMAND - UPDATED
// ============================================
async function debugCommand(testFile: string) {
  console.log(chalk.blue(`🔍 Debug mode: ${testFile}\n`));

  const engine = new CognitoEngine({
    browser: {
      headless: false,
      slowMo: 1000,
      args: [],
      viewport: { width: 1280, height: 720 },
      userAgent: "",
      ignoreHTTPSErrors: false,
    },
    timeouts: {
      default: 30000,
      navigation: 60000,
      element: 10000,
    },
    reporting: {
      html: { enabled: true, openAfter: false },
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
      clearTestRegistry();

      await import(pathToFileURL(path.resolve(testFile)).href);

      const registry = getTestRegistry();
      const tests = registry.getTestsToRun();

      if (tests.length === 0) {
        console.log(chalk.yellow("No tests found in file"));
        return;
      }

      console.log(
        chalk.blue(`Found ${tests.length} test(s), running in debug mode...\n`)
      );

      for (const test of tests) {
        console.log(chalk.gray(`▶️  Running: ${test.name}`));
        const page = await engine.newPage();

        try {
          await test.fn(page);
          console.log(chalk.green(`✅ ${test.name} passed`));
        } catch (error: any) {
          console.error(chalk.red(`❌ ${test.name} failed:`));
          console.error(chalk.red(error.message));
        }

        await page.close();
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

// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Detecta si necesitamos cargar TypeScript y reinicia el proceso con tsx
 */
async function ensureTypeScriptSupport(testFiles: string[]): Promise<boolean> {
  const hasTypescriptFiles = testFiles.some((f) => f.endsWith(".ts"));

  if (!hasTypescriptFiles || process.env.COGNITO_TS_LOADED === "1") {
    return true;
  }

  try {
    await import("tsx");
  } catch {
    console.log(
      chalk.yellow("\nTypeScript files detected but tsx is not installed.")
    );
    console.log(chalk.blue("Please install tsx: npm install --save-dev tsx\n"));
    return false;
  }

  return new Promise((_resolve) => {
    const args = ["--import", "tsx", ...process.argv.slice(1)];

    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: { ...process.env, COGNITO_TS_LOADED: "1" },
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

// ============================================
// GENERATOR FUNCTIONS
// ============================================

function generatePackageJson(projectName: string, answers: any) {
  const pkg: any = {
    name: projectName,
    version: "1.0.0",
    description: "Cognito Framework test automation project",
    type: "module",
    scripts: {
      test: "cognito run",
      "test:headless": "cognito run --headless",
      "test:debug": "cognito debug",
      "test:ci": "cognito run --headless",
    },
    keywords: ["testing", "automation", "Cognito", "playwright"],
    author: "",
    license: "MIT",
    dependencies: {
      "cognito-framework": "^0.1.0",
      playwright: "^1.40.0",
      tsx: "^4.20.6",
    },
    devDependencies: {},
  };

  if (answers.useTypeScript) {
    pkg.devDependencies = {
      typescript: "^5.0.0",
      "@types/node": "^20.0.0",
      "ts-node": "^10.9.0",
    };
    pkg.scripts.build = "tsc";
  }

  if (answers.features.includes("allure")) {
    pkg.devDependencies["allure-commandline"] = "^2.24.0";
    pkg.scripts["allure:generate"] =
      "allure generate cognito-results/allure-results --clean";
    pkg.scripts["allure:open"] = "allure open cognito-results/allure-report";
  }

  return pkg;
}

function generateTsConfig() {
  return {
    compilerOptions: {
      target: "ES2020",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      lib: ["ES2020"],
      outDir: "./dist",
      rootDir: "./src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      types: ["node"],
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "cognito-results"],
  };
}

function generateJsConfig() {
  return {
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "node",
      checkJs: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "cognito-results"],
  };
}

function generateConfig(answers: any): string {
  const features = answers.features || [];
  return `// Cognito Framework Configuration
import { defineConfig } from 'cognito-framework';

export default defineConfig({
  // Browser configuration
  browser: {
    headless: process.env.CI === 'true',
    viewport: { width: 1920, height: 1080 },
    slowMo: 0
  },

  // Test execution timeouts
  timeouts: {
    default: 30000,
    navigation: 60000,
    element: 10000
  },

  // Feature toggles
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

  // Reporting configuration
  reporting: {
    html: { 
      enabled: true, 
      openAfter: !process.env.CI 
    },
    allure: { 
      enabled: ${features.includes("allure")} 
    },
    custom: {
      enabled: false
    }
  },

  // Logging configuration
  logging: {
    level: process.env.DEBUG ? 'debug' : 'info'
  }
});`;
}

function generateGitignore(): string {
  return `# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build outputs
dist/
*.tsbuildinfo

# Test results
cognito-results/
test-results/
playwright-report/

# Environment variables
.env
.env.local

# IDE
.vscode/settings.json
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`;
}

function generateReadme(projectName: string, answers: any): string {
  return `# ${projectName}

Cognito Framework test automation project

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm/yarn/pnpm

### Installation

\`\`\`bash
npm install
npx playwright install
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run in headless mode
npm run test:headless

# Debug a specific test
npm run test:debug src/tests/example.cognito.${
    answers.useTypeScript ? "ts" : "js"
  }
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── tests/           # Test files (*.cognito.ts)
│   ├── pages/           # Page Object Models
│   └── utils/           # Utility functions
├── cognito-results/         # Test results, screenshots, reports
├── cognito.config.${
    answers.useTypeScript ? "ts" : "js"
  }        # Cognito configuration
└── package.json
\`\`\`

## Writing Tests

Create test files in \`src/tests/\` with \`.cognito.${
    answers.useTypeScript ? "ts" : "js"
  }\` extension:

\`\`\`${answers.useTypeScript ? "typescript" : "javascript"}
${
  answers.useTypeScript
    ? "import { CognitoPage } from 'cognito-framework';"
    : ""
}

export default async function myTest(page${
    answers.useTypeScript ? ": CognitoPage" : ""
  }) {
  await page.goto('https://example.com');
  
  // Smart locators
  await page.smartClick('login button');
  await page.smartFill('username', 'testuser');
  
  // Take screenshot for evidence
  await page.screenshot({ path: 'cognito-results/screenshots/test.png' });
}
\`\`\`

## Features Enabled

${answers.features.map((f: string) => `- ${f}`).join("\n")}

## Reports

Test reports are generated in \`cognito-results/reports/\`

${
  answers.features.includes("allure")
    ? `
### Allure Reports

\`\`\`bash
npm run allure:generate
npm run allure:open
\`\`\`
`
    : ""
}

## Configuration

Edit \`cognito.config.${answers.useTypeScript ? "ts" : "js"}\` to customize:
- Browser settings
- Timeouts
- Feature toggles
- Reporting options

## Documentation

- [Cognito Framework Docs](https://cognito-framework.dev)
- [Playwright API](https://playwright.dev)

## Contributing

1. Write tests in \`src/tests/\`
2. Follow naming convention: \`*.cognito.${
    answers.useTypeScript ? "ts" : "js"
  }\`
3. Use Page Objects in \`src/pages/\` for reusability
4. Run tests before committing

## License

MIT
`;
}

function generateEnvExample(): string {
  return `# Environment variables for Cognito tests
# Copy this file to .env and fill in your values

# Base URL for testing
BASE_URL=https://example.com

# Test credentials (DO NOT commit real credentials)
TEST_USERNAME=testuser
TEST_PASSWORD=testpass

# API keys
API_KEY=your_api_key_here

# CI mode
CI=false

# Debug mode
DEBUG=false
`;
}

async function createExampleTests(projectPath: string, answers: any) {
  const ext = answers.useTypeScript ? "ts" : "js";
  const importType = answers.useTypeScript ? ": CognitoPage" : "";
  const importAllStatement = answers.useTypeScript
    ? "import { test, CognitoPage, expect } from 'cognito-framework';\n\n"
    : "";
  const importPageStatement = answers.useTypeScript
    ? "import { CognitoPage } from 'cognito-framework';\n\n"
    : "";

  // Example 1: Basic navigation
  await fs.writeFile(
    path.join(projectPath, `tests/examples/simple.cognito.${ext}`),
    `${importAllStatement}test('Navigate to example.com', async (page: CognitoPage) => {
  await page.goto('https://example.com');
  await page.screenshot({ path: 'cognito-results/screenshots/example.png' });
});

test('Click more information link', async (page: CognitoPage) => {
  await page.goto('https://example.com');
  await page.smartClick('More');
});
`
  );

  // Example 2: Smart interactions (if AI Healing enabled)
  //   if (answers.features.includes("aiHealing")) {
  //     await fs.writeFile(
  //       path.join(projectPath, `src/tests/example-smart-clicks.cognito.${ext}`),
  //       `${importAllStatement}export default async function smartClickTest(page${importType}) {
  //   await page.goto('https://httpbin.org/forms/post');

  //   // Use smart locators - finds elements by description
  //   await page.smartFill('custname', 'John Doe');
  //   await page.smartFill('custtel', '555-1234');

  //   // Take screenshot for evidence
  //   await page.screenshot({
  //     path: 'cognito-results/screenshots/form-filled.png'
  //   });

  //   console.log('Smart interaction test passed');
  // }`
  //     );
  //   }

  // Example 3: Page Object Model
  await fs.writeFile(
    path.join(projectPath, `src/pages/examples/ExamplePage.${ext}`),
    `${importPageStatement}export class ExamplePage {
  constructor(private page${importType}) {}

  async navigate() {
    await this.page.goto("https://the-internet.herokuapp.com/login");
  }

  async login(username: string, password: string) {
    await this.page.smartFill("Username", username);
    await this.page.smartFill("Password", password);
    await this.page.smartClick("Login");
  }

  async takeScreenshot(name${answers.useTypeScript ? ": string" : ""}) {
    await this.page.screenshot({ 
      path: \`cognito-results/screenshots/\${name}.png\` 
    });
  }
  
  async getMessage() {
    return this.page.getPage().locator("#flash");
  }
}`
  );

  // Example using Page Object
  await fs.writeFile(
    path.join(projectPath, `tests/examples/login.cognito.${ext}`),
    `${importAllStatement}import { ExamplePage } from '../../src/pages/examples/ExamplePage';

 test("Should login with valid credentials", async (page: CognitoPage) => {
    const examplePage = new ExamplePage(page);

    await examplePage.navigate();

    await examplePage.login("tomsmith", "SuperSecretPassword!");

    const message = await examplePage.getMessage();

    await expect(message).toContainText("logged into a secure area");
  });

  test("Should show error with invalid username", async (page: CognitoPage) => {
    const examplePage = new ExamplePage(page);

    await examplePage.navigate();

    await examplePage.login("Invalid", "SuperSecretPassword!");

    const message = await examplePage.getMessage();
    expect(await message.textContent()).toContain("Your username is invalid!");
  });

  test("Should show error with invalid password", async (page: CognitoPage) => {
    const examplePage = new ExamplePage(page);

    await examplePage.navigate();

    await examplePage.login("tomsmith", "SuperSecretPassword");

    const message = await examplePage.getMessage();
    expect(await message.textContent()).toContain("Your password is invalid!");
  });
  
  `
  );
}

async function createVSCodeConfig(projectPath: string) {
  await fs.writeJSON(
    path.join(projectPath, ".vscode/settings.json"),
    {
      "typescript.preferences.importModuleSpecifier": "relative",
      "editor.formatOnSave": true,
      "files.exclude": {
        node_modules: true,
        "cognito-results": true,
        dist: true,
      },
    },
    { spaces: 2 }
  );

  await fs.writeJSON(
    path.join(projectPath, ".vscode/launch.json"),
    {
      version: "0.2.0",
      configurations: [
        {
          name: "Debug Cognito Test",
          type: "node",
          request: "launch",
          runtimeExecutable: "npm",
          runtimeArgs: ["run", "test:debug", "--", "${file}"],
          console: "integratedTerminal",
        },
      ],
    },
    { spaces: 2 }
  );
}

async function createGithubWorkflow(projectPath: string, answers: any) {
  const workflow = `name: Cognito Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: cognito-results
        path: cognito-results/
        retention-days: 30
${
  answers.features.includes("allure")
    ? `
    - name: Generate Allure report
      if: always()
      run: npm run allure:generate
    
    - name: Upload Allure report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: allure-report
        path: cognito-results/allure-report/
`
    : ""
}`;

  await fs.writeFile(
    path.join(projectPath, ".github/workflows/tests.yml"),
    workflow
  );
}

export function defineConfig(config: any) {
  return config;
}

program.parse();
