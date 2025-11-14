import { LocatorResultType } from "./LocatorResultType.js";

/**
 * Search strategy for locating elements
 */
export interface LocatorStrategyType {
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
  handler?: (selector: string) => Promise<LocatorResultType | null>;
}
