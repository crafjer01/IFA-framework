// Smart Local Options
export interface SmartLocatorOptions {
  threshold?: number; // 0-1 for fuzzy matching
  timeout?: number;
  ignoreCase?: boolean;
  trimWhitespace?: boolean;
  languages?: string[];
  maxRetries?: number;
}

export interface LocatorResult {
  element: any; // Playwright element
  confidence: number;
  strategy: string;
  matchedText?: string;
  selector?: string;
}

export interface TextLocatorConfig {
  exactMatch: boolean;
  partialMatch: boolean;
  fuzzyMatch: boolean;
  ariaLabelMatch: boolean;
  placeholderMatch: boolean;
  titleMatch: boolean;
}
