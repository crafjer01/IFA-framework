import { TestFunctionType } from "./TestFunctionType.js";

export interface TestCaseType {
  name: string;
  fn: TestFunctionType;
  skip?: boolean;
  only?: boolean;
  timeout?: number;
}
