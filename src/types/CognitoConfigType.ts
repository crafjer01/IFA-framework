export interface CognitoConfigType {
  browser: {
    headless: boolean;
    slowMo: number;
    args: string[];
    viewport: { width: number; height: number };
    userAgent: string;
    ignoreHTTPSErrors: boolean;
  };

  timeouts: {
    default: number;
    navigation: number;
    element: number;
  };

  features?: {
    aiHealing: {
      enabled: boolean;
      learningRate: number;
    };

    visualTesting: {
      enabled: boolean;
      threshold: number;
    };

    performance?: {
      enabled: boolean;
      budgets: Record<string, number>;
    };
  };

  reporting: {
    html: { enabled: boolean; openAfter: boolean };
    allure: { enabled: boolean; server?: string };
    custom: { enabled: boolean; webhook?: string };
  };

  logging: {
    level: "error" | "warn" | "info" | "debug";
    file?: string;
  };
  resultsBaseDir: string;
}
