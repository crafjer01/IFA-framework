export interface CognitoConfig {
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
}

export interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  timestamp: string;
  error?: string;
  stack?: string;
  screenshots: string[];
  logs: LogEntry[];
}

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  error?: Error | undefined;
}

export interface CognitoPage {
  // Playwright Page methods
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  screenshot(options?: { path: string }): Promise<Buffer>;
  close(): Promise<void>;
  setContent(
    html: string,
    options?: {
      timeout?: number;
      waitUntil?: "load" | "domcontentloaded" | "networkidle";
    }
  ): Promise<void>;

  smartClick(description: string): Promise<void>;
  smartFill(description: string, value: string): Promise<void>;
  adaptiveWait(condition: string): Promise<void>;
}
