// src/core/types/SmartLocator.ts
import { ElementHandle } from "@playwright/test";

/**
 * Options for SmartLocator
 */
export interface SmartLocatorOptions {
  /**
   * Maximum time to wait for element (ms)
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;

  /**
   * Minimum confidence score (0-1)
   */
  confidence?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Result from locator search
 */
export interface LocatorResult {
  /**
   * The found element handle
   */
  element: ElementHandle;

  /**
   * The selector used to find the element
   */
  selector: string;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Strategy name that found the element
   */
  strategy: string;
}

/**
 * Search strategy for locating elements
 */
export interface LocatorStrategy {
  /**
   * Strategy name
   */
  name: string;

  /**
   * CSS/Playwright selector
   */
  selector: string;

  /**
   * Expected confidence level
   */
  confidence?: number;

  /**
   * Custom handler for complex strategies
   */
  handler?: (selector: string) => Promise<LocatorResult | null>;
}
