import { LogEntryType } from "./LogEntryType.js";

export interface TestResultType {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  timestamp: string;
  error?: string;
  stack?: string;
  screenshots: string[];
  logs: LogEntryType[];
}
