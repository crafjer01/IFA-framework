/**
 * Options for SmartLocator
 */
export interface SmartLocatorOptionsType {
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
