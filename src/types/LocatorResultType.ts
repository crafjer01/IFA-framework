import { ElementHandle } from "@playwright/test";

/**
 * Result from locator search
 */
export interface LocatorResultType {
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
