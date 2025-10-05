import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

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
    console.log(chalk.blue("🚀 Starting FAU project initialization..."));

    try {
      // Simple initialization without inquirer for now
      const projectName = path.basename(process.cwd());

      console.log(chalk.gray("Creating directory structure..."));

      // Create directory structure
      await fs.ensureDir("tests");
      await fs.ensureDir("fau-results");
      await fs.ensureDir("fau-results/screenshots");
      await fs.ensureDir("fau-results/reports");

      console.log(chalk.gray("Creating configuration files..."));

      // Create simple config file
      const configContent = `// FAU Framework Configuration
export default {
  browser: {
    headless: process.env.CI === 'true',
    viewport: { width: 1920, height: 1080 }
  },
  features: {
    aiHealing: { enabled: true, learningRate: 0.8 },
    visualTesting: { enabled: false, threshold: 0.1 },
    performance: { enabled: false }
  },
  reporting: {
    html: { enabled: true, openAfter: !process.env.CI },
    allure: { enabled: false }
  }
};`;

      await fs.writeFile("fau.config.js", configContent);

      // Create package.json if it doesn't exist
      const packageJsonExists = await fs.pathExists("package.json");
      if (!packageJsonExists) {
        const packageJson = {
          name: projectName,
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

        await fs.writeJSON("package.json", packageJson, { spaces: 2 });
      }

      // Create example test
      const testContent = `// Example FAU test
export default async function exampleTest(page) {
  console.log('🧪 Starting example test...');
  
  // Navigate to a page
  await page.goto('https://example.com');
  
  // Take a screenshot for evidence
  await page.screenshot({ path: 'fau-results/screenshots/example.png' });
  
  console.log('✅ Example test completed successfully!');
}`;

      await fs.writeFile("tests/example.fau.js", testContent);

      // Create .gitignore
      const gitignoreContent = `node_modules/
fau-results/
*.log
.env
dist/`;

      await fs.writeFile(".gitignore", gitignoreContent);

      console.log(chalk.green("✅ FAU project initialized successfully!"));
      console.log(chalk.blue("\nNext steps:"));
      console.log("1. npm install");
      console.log("2. fau run");
      console.log(
        "3. Check the example test in",
        chalk.cyan("tests/example.fau.js")
      );
    } catch (error: any) {
      console.error(chalk.red("❌ Failed to initialize project:"), error);
      console.error(chalk.red("Error details:"), error.message);
      process.exit(1);
    }
  });

program
  .command("test")
  .description("Test command - just to verify CLI is working")
  .action(() => {
    console.log(chalk.green("✅ CLI is working correctly!"));
  });

// Export helper function for configuration
export function defineConfig(config: any) {
  return config;
}

program.parse();
