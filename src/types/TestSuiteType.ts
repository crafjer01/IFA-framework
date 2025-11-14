import { TestCaseType } from "./TestCaseType.js";

export interface TestSuiteType {
  name: string;
  tests: TestCaseType[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}
