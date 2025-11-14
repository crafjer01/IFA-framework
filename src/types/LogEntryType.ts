export interface LogEntryType {
  level: string;
  message: string;
  timestamp: string;
  error?: Error | undefined;
}
