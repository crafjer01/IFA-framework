import { TestCaseType, TestSuiteType } from "../types/index.js";

/**
 * Global test registry - stores all registered tests
 */
export class TestRegistry {
  private suites: Map<string, TestSuiteType> = new Map();
  private currentSuite: TestSuiteType | null = null;
  private globalTests: TestCaseType[] = [];

  registerTest(test: TestCaseType): void {
    if (this.currentSuite) {
      this.currentSuite.tests.push(test);
    } else {
      this.globalTests.push(test);
    }
  }

  createSuite(name: string): TestSuiteType {
    const suite: TestSuiteType = {
      name,
      tests: [],
    };
    this.suites.set(name, suite);
    return suite;
  }

  setCurrentSuite(suite: TestSuiteType | null): void {
    this.currentSuite = suite;
  }

  getAllTests(): TestCaseType[] {
    const allTests: TestCaseType[] = [...this.globalTests];

    for (const suite of this.suites.values()) {
      allTests.push(...suite.tests);
    }

    return allTests;
  }

  getSuites(): TestSuiteType[] {
    return Array.from(this.suites.values());
  }

  getGlobalTests(): TestCaseType[] {
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

  getTestsToRun(): TestCaseType[] {
    const allTests = this.getAllTests();

    // If there are .only() tests, run only those
    if (this.hasOnlyTests()) {
      return allTests.filter((t) => t.only);
    }

    // Otherwise, run all non-skipped tests
    return allTests.filter((t) => !t.skip);
  }
}
