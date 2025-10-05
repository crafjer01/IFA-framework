const readmeContent = `# FAU Framework`

🚀 AI-powered web automation framework with TypeScript and Playwright

## Features

- **Smart Locators**: Find elements using natural language descriptions
- **AI Self-Healing**: Automatically adapts to UI changes (coming in Sprint 3-4)
- **Visual Testing**: Pixel-perfect screenshot comparisons (coming in Sprint 7-8)
- **Performance Monitoring**: Built-in Core Web Vitals tracking (coming in Sprint 9-10)
- **Rich Reporting**: Interactive HTML reports and Allure integration
- **TypeScript First**: Full type safety and IntelliSense support

## Quick Start

### Installation

\`\`\`bash
npm install fau-framework
\`\`\`

### Initialize Project

\`\`\`bash
npx fau init
\`\`\`

This will create:

- \`fau.config.ts\` - Framework configuration
- \`tests/\` - Test files directory
- \`fau-results/\` - Reports and screenshots

### Write Your First Test

\`\`\`typescript
// tests/example.fau.ts
import { FauPage } from 'fau-framework';

export default async function loginTest(page: FauPage) {
await page.goto('https://example.com/login');

// Smart locators - find elements by description
await page.smartFill('username', 'testuser');
await page.smartFill('password', 'password123');
await page.smartClick('login button');

// Take evidence screenshot
await page.screenshot({ path: 'fau-results/screenshots/login-success.png' });
}
\`\`\`

### Run Tests

\`\`\`bash

# Run all tests

npm test

# Run in headless mode

npm run test:headless

# Debug a specific test

npx fau debug tests/example.fau.ts
\`\`\`

## Configuration

\`\`\`typescript
// fau.config.ts
import { defineConfig } from 'fau-framework';

export default defineConfig({
browser: {
headless: process.env.CI === 'true',
viewport: { width: 1920, height: 1080 }
},
features: {
aiHealing: { enabled: true, learningRate: 0.8 },
visualTesting: { enabled: true, threshold: 0.1 },
performance: { enabled: true, budgets: { lcp: 2500 } }
},
reporting: {
html: { enabled: true, openAfter: !process.env.CI },
allure: { enabled: true }
}
});
\`\`\`

## API Reference

### FauPage Methods

#### Basic Actions

- \`goto(url: string)\` - Navigate to URL
- \`click(selector: string)\` - Click element
- \`fill(selector: string, value: string)\` - Fill input
- \`screenshot(options?)\` - Take screenshot

#### Smart Actions (Sprint 1 - Basic Implementation)

- \`smartClick(description: string)\` - Click by description
- \`smartFill(description: string, value: string)\` - Fill by description
- \`adaptiveWait(condition: string)\` - Intelligent waiting

## CLI Commands

- \`fau init\` - Initialize new project
- \`fau run\` - Run all tests
- \`fau debug <test>\` - Debug single test
- \`fau --help\` - Show all commands

## Reports

FAU generates comprehensive test reports:

- **HTML Report**: Interactive dashboard with screenshots
- **Allure Report**: Integration with Allure TestOps
- **JSON Report**: Custom integrations and webhooks

Reports are saved in \`fau-results/reports/\`

## Development Status

This is Sprint 1-2 implementation. Coming features:

- **Sprint 3-4**: Advanced AI healing and smart locators
- **Sprint 5-6**: Machine learning element recognition
- **Sprint 7-8**: Visual regression testing
- **Sprint 9-10**: Performance monitoring
- **Sprint 11-12**: Advanced reporting system

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## License

MIT License - see LICENSE file for details.
`;

// Create README.md file helper
export function generateReadme(): string {
return readmeContent;
}
