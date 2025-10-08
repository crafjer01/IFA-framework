// src/cli.ts - IMPROVED VERSION
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import { glob } from "glob";
import { IFAEngine } from "./core/IFAEngine.js";

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
        default: projectNameArg || "my-ifa-project",
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

    spinner.start(chalk.blue("Creating IFA project structure..."));

    // Create project directory
    await fs.ensureDir(projectPath);

    // Create complete directory structure
    const directories = [
      "src/tests",
      "src/pages",
      "src/utils",
      "ifa-results/screenshots",
      "ifa-results/reports",
      "ifa-results/videos",
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

    // 3. IFA config
    const configContent = generateConfig(answers);
    const configPath = path.join(
      projectPath,
      answers.useTypeScript ? "ifa.config.ts" : "ifa.config.js"
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

    spinner.succeed(chalk.green("IFA project structure created!"));

    // Show next steps
    console.log(chalk.blue("\n📦 Next steps:\n"));

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

    console.log(chalk.blue("\n📚 Project structure:"));
    console.log(
      chalk.gray(`
  ${projectName}/
  ├── src/
  │   ├── tests/           # Your test files
  │   ├── pages/           # Page Object Models
  │   └── utils/           # Utility functions
  ├── ifa-results/         # Test results and reports
  ├── ifa.config.ts        # IFA configuration
  ├── package.json
  └── README.md
    `)
    );

    console.log(chalk.green("\n✅ Project initialized successfully!\n"));
  } catch (error) {
    spinner.fail("Failed to initialize project");
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
}

async function runCommand(options: any) {
  const spinner = ora("Starting IFA test run...").start();

  try {
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
    spinner.succeed("IFA Engine initialized");

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

// ============================================
// GENERATOR FUNCTIONS
// ============================================

function generatePackageJson(projectName: string, answers: any) {
  const pkg: any = {
    name: projectName,
    version: "1.0.0",
    description: "IFA Framework test automation project",
    type: "module",
    scripts: {
      test: "ifa run",
      "test:headless": "ifa run --headless",
      "test:debug": "ifa debug",
      "test:ci": "ifa run --headless",
    },
    keywords: ["testing", "automation", "ifa", "playwright"],
    author: "",
    license: "MIT",
    dependencies: {
      "ifa-framework": "^0.1.0",
      playwright: "^1.40.0",
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
      "allure generate ifa-results/allure-results --clean";
    pkg.scripts["allure:open"] = "allure open ifa-results/allure-report";
  }

  return pkg;
}

function generateTsConfig() {
  return {
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "node",
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
    exclude: ["node_modules", "dist", "ifa-results"],
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
    exclude: ["node_modules", "ifa-results"],
  };
}

function generateConfig(answers: any): string {
  const features = answers.features || [];
  return `// IFA Framework Configuration
import { defineConfig } from 'ifa-framework';

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
ifa-results/
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

IFA Framework test automation project

## 🚀 Getting Started

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
npm run test:debug src/tests/example.ifa.${answers.useTypeScript ? "ts" : "js"}
\`\`\`

## 📁 Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── tests/           # Test files (*.ifa.ts)
│   ├── pages/           # Page Object Models
│   └── utils/           # Utility functions
├── ifa-results/         # Test results, screenshots, reports
├── ifa.config.${answers.useTypeScript ? "ts" : "js"}        # IFA configuration
└── package.json
\`\`\`

## 📝 Writing Tests

Create test files in \`src/tests/\` with \`.ifa.${
    answers.useTypeScript ? "ts" : "js"
  }\` extension:

\`\`\`${answers.useTypeScript ? "typescript" : "javascript"}
${answers.useTypeScript ? "import { IFAPage } from 'ifa-framework';" : ""}

export default async function myTest(page${
    answers.useTypeScript ? ": IFAPage" : ""
  }) {
  await page.goto('https://example.com');
  
  // Smart locators
  await page.smartClick('login button');
  await page.smartFill('username', 'testuser');
  
  // Take screenshot for evidence
  await page.screenshot({ path: 'ifa-results/screenshots/test.png' });
}
\`\`\`

## 🎯 Features Enabled

${answers.features.map((f: string) => `- ${f}`).join("\n")}

## 📊 Reports

Test reports are generated in \`ifa-results/reports/\`

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

## 🔧 Configuration

Edit \`ifa.config.${answers.useTypeScript ? "ts" : "js"}\` to customize:
- Browser settings
- Timeouts
- Feature toggles
- Reporting options

## 📚 Documentation

- [IFA Framework Docs](https://ifa-framework.dev)
- [Playwright API](https://playwright.dev)

## 🤝 Contributing

1. Write tests in \`src/tests/\`
2. Follow naming convention: \`*.ifa.${answers.useTypeScript ? "ts" : "js"}\`
3. Use Page Objects in \`src/pages/\` for reusability
4. Run tests before committing

## 📄 License

MIT
`;
}

function generateEnvExample(): string {
  return `# Environment variables for IFA tests
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
  const importType = answers.useTypeScript ? ": IFAPage" : "";
  const importStatement = answers.useTypeScript
    ? "import { IFAPage } from 'ifa-framework';\n\n"
    : "";

  // Example 1: Basic navigation
  await fs.writeFile(
    path.join(projectPath, `src/tests/example-navigation.ifa.${ext}`),
    `${importStatement}export default async function navigationTest(page${importType}) {
  // Navigate to example site
  await page.goto('https://example.com');
  
  // Take screenshot
  await page.screenshot({ 
    path: 'ifa-results/screenshots/example-page.png' 
  });
  
  console.log('✅ Navigation test passed');
}`
  );

  // Example 2: Smart interactions (if AI Healing enabled)
  if (answers.features.includes("aiHealing")) {
    await fs.writeFile(
      path.join(projectPath, `src/tests/example-smart-clicks.ifa.${ext}`),
      `${importStatement}export default async function smartClickTest(page${importType}) {
  await page.goto('https://httpbin.org/forms/post');
  
  // Use smart locators - finds elements by description
  await page.smartFill('custname', 'John Doe');
  await page.smartFill('custtel', '555-1234');
  
  // Take screenshot for evidence
  await page.screenshot({ 
    path: 'ifa-results/screenshots/form-filled.png' 
  });
  
  console.log('✅ Smart interaction test passed');
}`
    );
  }

  // Example 3: Page Object Model
  await fs.writeFile(
    path.join(projectPath, `src/pages/ExamplePage.${ext}`),
    `${importStatement}export class ExamplePage {
  constructor(private page${importType}) {}

  async navigate() {
    await this.page.goto('https://example.com');
  }

  async clickMoreInfo() {
    await this.page.smartClick('More information');
  }

  async takeScreenshot(name${answers.useTypeScript ? ": string" : ""}) {
    await this.page.screenshot({ 
      path: \`ifa-results/screenshots/\${name}.png\` 
    });
  }
}`
  );

  // Example using Page Object
  await fs.writeFile(
    path.join(projectPath, `src/tests/example-with-pom.ifa.${ext}`),
    `${importStatement}import { ExamplePage } from '../pages/ExamplePage.js';

export default async function pomTest(page${importType}) {
  const examplePage = new ExamplePage(page);
  
  await examplePage.navigate();
  await examplePage.clickMoreInfo();
  await examplePage.takeScreenshot('pom-example');
  
  console.log('✅ POM test passed');
}`
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
        "ifa-results": true,
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
          name: "Debug IFA Test",
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
  const workflow = `name: IFA Tests

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
        name: ifa-results
        path: ifa-results/
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
        path: ifa-results/allure-report/
`
    : ""
}`;

  await fs.writeFile(
    path.join(projectPath, ".github/workflows/tests.yml"),
    workflow
  );
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
