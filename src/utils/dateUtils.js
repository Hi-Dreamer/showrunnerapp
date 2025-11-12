/**
 * Date utility functions for formatting and parsing dates in the ShowRunner app
 */
export class DateUtils {
  /**
   * Formats a date for API submission (ISO 8601 string)
   * @param {Date|string|null|undefined} date - The date to format
   * @returns {string|null} ISO 8601 string or null
   */
  static formatForAPI(date) {
    if (!date) return null;
    if (date instanceof Date) {
      return date.toISOString();
    }
    // If it's already a string, return as-is (assumes it's already ISO format)
    if (typeof date === 'string') {
      return date;
    }
    return null;
  }

  /**
   * Parses a date string from the API into a Date object
   * @param {string|null|undefined} dateString - The date string to parse
   * @returns {Date|null} Date object or null
   */
  static parseFromAPI(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
  }

  /**
   * Gets the next hour (current time + 1 hour, rounded to the hour)
   * @returns {Date} Date object set to the next hour
   */
  static getNextHour() {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  }

  /**
   * Gets the next end hour (start date + 5 hours)
   * @param {Date} startDate - The start date (optional, defaults to next hour)
   * @returns {Date} Date object set to start date + 5 hours
   */
  static getNextEndHour(startDate) {
    const date = new Date(startDate || DateUtils.getNextHour());
    date.setHours(date.getHours() + 5);
    return date;
  }

  /**
   * Formats a date for display in the UI
   * @param {Date|string|null|undefined} date - The date to format
   * @returns {string} Formatted date string or 'Not set'
   */
  static formatForDisplay(date) {
    if (!date) return 'Not set';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

