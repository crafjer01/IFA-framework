import * as fsExtra from "fs-extra";
import chalk from "chalk";
import { LogEntryType } from "../types/index.js";

// Determinar el objeto correcto: si fsExtra tiene existsSync, lo usamos; si no, usamos fsExtra.default
const fs = (fsExtra as any).existsSync ? fsExtra : (fsExtra as any).default;

export class Logger {
  private logs: LogEntryType[] = [];
  private config: { level: string; file?: string };

  constructor(config: { level: string; file?: string }) {
    this.config = config;

    if (config.file) {
      fs.ensureFileSync(config.file);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ["error", "warn", "info", "debug"];
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);

    return messageLevel <= configLevel;
  }

  private addLog(level: string, message: string, error?: Error): void {
    const entry: LogEntryType = {
      level,
      message,
      timestamp: new Date().toISOString(),
      error,
    };

    this.logs.push(entry);

    if (this.config.file) {
      fs.appendFileSync(this.config.file, JSON.stringify(entry) + "\n");
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog("error")) {
      console.error(chalk.red(`[ERROR] ${message}`), error || "");
      this.addLog("error", message, error);
    }
  }

  warn(message: string, error?: Error): void {
    if (this.shouldLog("warn")) {
      console.warn(chalk.yellow(`[WARN] ${message}`), error || "");
      this.addLog("warn", message, error);
    }
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      console.log(chalk.blue(`[INFO] ${message}`));
      this.addLog("info", message);
    }
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
      this.addLog("debug", message);
    }
  }

  getLogs(): LogEntryType[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
