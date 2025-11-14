import { CognitoPageType } from "./index.js";

export interface TestFunctionType {
  (page: CognitoPageType): Promise<void>;
}
