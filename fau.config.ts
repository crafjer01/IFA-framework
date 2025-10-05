// FAU Framework Configuration
import { defineConfig } from 'fau-framework';

export default defineConfig({
  browser: {
    headless: process.env.CI === 'true',
    viewport: { width: 1920, height: 1080 }
  },
  features: {
    aiHealing: { 
      enabled: true, 
      learningRate: 0.8 
    },
    visualTesting: { 
      enabled: true, 
      threshold: 0.1 
    },
    performance: { 
      enabled: true, 
      budgets: { lcp: 2500, fid: 100, cls: 0.1 } 
    }
  },
  reporting: {
    html: { enabled: true, openAfter: !process.env.CI },
    allure: { enabled: true }
  }
});