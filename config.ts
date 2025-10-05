// fau.config.ts
export default defineConfig({
  browser: { headless: process.env.CI === "true" },
  features: {
    aiHealing: { enabled: true, learningRate: 0.8 },
    visualTesting: { enabled: true, threshold: 0.1 },
  },
  reporting: {
    html: { enabled: true, openAfter: !process.env.CI },
  },
});
