import { TestRegistry } from "./TestRegister.js";
import { TestFunctionType } from "../types/index.js";
// Global registry instance
const registry = new TestRegistry();

/**
 * Main test function - registers a test case
 */
export function test(name: string, fn: TestFunctionType): void {
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
test.skip = function (name: string, fn: TestFunctionType): void {
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
test.only = function (name: string, fn: TestFunctionType): void {
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
