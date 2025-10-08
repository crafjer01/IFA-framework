
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
npm install IFA-framework
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



// Create README.md file helper
export function generateReadme(): string {
return readmeContent;
}
