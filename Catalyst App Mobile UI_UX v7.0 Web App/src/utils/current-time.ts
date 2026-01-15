/**
 * Central utility for getting the current time across the application.
 * Uses the actual current date/time for all calculations.
 */

/**
 * Get the current date and time
 * @returns Current date as a Date object
 */
export function getCurrentTime(): Date {
  return new Date();
}

/**
 * Get the current timestamp in milliseconds
 * @returns Current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}