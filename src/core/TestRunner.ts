// src/core/TestRunner.ts
import { CognitoPage } from "./Types.js";

export interface TestFunction {
  (page: CognitoPage): Promise<void>;
}

export interface TestCase {
  name: string;
  fn: TestFunction;
  skip?: boolean;
  only?: boolean;
  timeout?: number;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

/**
 * Global test registry - stores all registered tests
 */
class TestRegistry {
  private suites: Map<string, TestSuite> = new Map();
  private currentSuite: TestSuite | null = null;
  private globalTests: TestCase[] = [];

  registerTest(test: TestCase): void {
    if (this.currentSuite) {
      this.currentSuite.tests.push(test);
    } else {
      this.globalTests.push(test);
    }
  }

  createSuite(name: string): TestSuite {
    const suite: TestSuite = {
      name,
      tests: [],
    };
    this.suites.set(name, suite);
    return suite;
  }

  setCurrentSuite(suite: TestSuite | null): void {
    this.currentSuite = suite;
  }

  getAllTests(): TestCase[] {
    const allTests: TestCase[] = [...this.globalTests];

    for (const suite of this.suites.values()) {
      allTests.push(...suite.tests);
    }

    return allTests;
  }

  getSuites(): TestSuite[] {
    return Array.from(this.suites.values());
  }

  getGlobalTests(): TestCase[] {
    return this.globalTests;
  }

  clear(): void {
    this.suites.clear();
    this.currentSuite = null;
    this.globalTests = [];
  }

  hasOnlyTests(): boolean {
    return this.getAllTests().some((t) => t.only);
  }

  getTestsToRun(): TestCase[] {
    const allTests = this.getAllTests();

    // If there are .only() tests, run only those
    if (this.hasOnlyTests()) {
      return allTests.filter((t) => t.only);
    }

    // Otherwise, run all non-skipped tests
    return allTests.filter((t) => !t.skip);
  }
}

// Global registry instance
const registry = new TestRegistry();

/**
 * Main test function - registers a test case
 */
export function test(name: string, fn: TestFunction): void {
  registry.registerTest({
    name,
    fn,
    skip: false,
    only: false,
  });
}

/**
 * Skip a test
 */
test.skip = function (name: string, fn: TestFunction): void {
  registry.registerTest({
    name,
    fn,
    skip: true,
    only: false,
  });
};

/**
 * Run only this test (and other .only tests)
 */
test.only = function (name: string, fn: TestFunction): void {
  registry.registerTest({
    name,
    fn,
    skip: false,
    only: true,
  });
};

/**
 * Set timeout for a test
 */
test.setTimeout = function (_timeout: number): void {
  // This will be used by the runner
  // Store in a context that the next test can access
};

/**
 * Describe a test suite
 */
export function describe(name: string, fn: () => void): void {
  const suite = registry.createSuite(name);
  registry.setCurrentSuite(suite);

  try {
    fn();
  } finally {
    registry.setCurrentSuite(null);
  }
}

/**
 * Skip a test suite
 */
describe.skip = function (name: string, _fn: () => void): void {
  // Don't execute the suite function, effectively skipping all tests
  console.log(`Skipping suite: ${name}`);
};

/**
 * Run only this suite
 */
describe.only = function (name: string, fn: () => void): void {
  // Mark all tests in this suite as .only
  const suite = registry.createSuite(name);
  registry.setCurrentSuite(suite);

  try {
    fn();
    // Mark all tests in suite as only
    suite.tests.forEach((t) => (t.only = true));
  } finally {
    registry.setCurrentSuite(null);
  }
};

/**
 * Setup hooks
 */
export function beforeAll(fn: () => Promise<void>): void {
  if (registry["currentSuite"]) {
    registry["currentSuite"].beforeAll = fn;
  }
}

export function afterAll(fn: () => Promise<void>): void {
  if (registry["currentSuite"]) {
    registry["currentSuite"].afterAll = fn;
  }
}

export function beforeEach(fn: () => Promise<void>): void {
  if (registry["currentSuite"]) {
    registry["currentSuite"].beforeEach = fn;
  }
}

export function afterEach(fn: () => Promise<void>): void {
  if (registry["currentSuite"]) {
    registry["currentSuite"].afterEach = fn;
  }
}

/**
 * Expect assertion library (basic implementation)
 */
export function expect<T>(actual: T) {
  return {
    toBe(expected: T): void {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual(expected: T): void {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(
            expected
          )}`
        );
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected ${actual} to be truthy`);
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected ${actual} to be falsy`);
      }
    },
    toContain(item: any): void {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${item}`);
        }
      } else if (typeof actual === "string") {
        if (!actual.includes(item)) {
          throw new Error(`Expected string to contain ${item}`);
        }
      } else {
        throw new Error("toContain requires array or string");
      }
    },
    toBeGreaterThan(expected: number): void {
      if (typeof actual !== "number") {
        throw new Error("toBeGreaterThan requires number");
      }
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number): void {
      if (typeof actual !== "number") {
        throw new Error("toBeLessThan requires number");
      }
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toThrow(expectedError?: string | RegExp): void {
      if (typeof actual !== "function") {
        throw new Error("toThrow requires function");
      }
      try {
        (actual as any)();
        throw new Error("Expected function to throw");
      } catch (error: any) {
        if (expectedError) {
          if (typeof expectedError === "string") {
            if (!error.message.includes(expectedError)) {
              throw new Error(
                `Expected error message to include "${expectedError}", but got "${error.message}"`
              );
            }
          } else if (expectedError instanceof RegExp) {
            if (!expectedError.test(error.message)) {
              throw new Error(
                `Expected error message to match ${expectedError}, but got "${error.message}"`
              );
            }
          }
        }
      }
    },
  };
}

/**
 * Get the test registry (used by CLI)
 */
export function getTestRegistry(): TestRegistry {
  return registry;
}

/**
 * Clear the test registry (useful for testing)
 */
export function clearTestRegistry(): void {
  registry.clear();
}
