/**
 * Standardized error handling utilities.
 *
 * Three patterns are used throughout the codebase:
 * 1. Silent: Log error and return null/false (for graceful degradation)
 * 2. State: Set error state in React (for UI feedback)
 * 3. Throws: Throw error (for context hooks that require a provider)
 */

/**
 * Extracts a user-friendly error message from an unknown error.
 */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

/**
 * Logs an error with a descriptive message and returns null.
 * Used for the "silent" error handling pattern where operations
 * should fail gracefully without throwing.
 */
export function logError<T = null>(
  message: string,
  error?: unknown,
  returnValue: T = null as unknown as T
): T {
  if (error !== undefined) {
    console.error(message, error);
  } else {
    console.error(message);
  }
  return returnValue;
}

/**
 * Creates a hook that throws if used outside its provider.
 * Used for the "throws" error handling pattern for React context hooks.
 */
export function assertContext<T>(
  context: T | null,
  hookName: string,
  providerName: string
): asserts context is T {
  if (!context) {
    throw new Error(`${hookName} must be used within a ${providerName}`);
  }
}
