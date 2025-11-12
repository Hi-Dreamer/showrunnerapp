/**
 * Centralized error handling utilities
 * Provides consistent error parsing and user-friendly error messages
 */
export class ErrorHandler {
  /**
   * Parse an error response from the API
   * Handles both JSON and HTML error responses
   * @param {Response} response - The fetch Response object
   * @returns {Promise<Object>} Parsed error object with message and details
   */
  static async parseErrorResponse(response) {
    const errorText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Try to parse as JSON first
    if (contentType.includes('application/json')) {
      try {
        const errorData = JSON.parse(errorText);
        return {
          message: errorData.errors?.[0]?.message || 
                   errorData.error || 
                   errorData.message || 
                   `Request failed with status ${response.status}`,
          details: errorData,
          type: 'json',
        };
      } catch (e) {
        // Not valid JSON, fall through to HTML parsing
      }
    }

    // Parse HTML error response
    return {
      message: this.parseHtmlError(errorText) || response.statusText || `Request failed with status ${response.status}`,
      details: { html: errorText.substring(0, 500) },
      type: 'html',
    };
  }

  /**
   * Extract error message from HTML error page
   * @param {string} html - HTML error page content
   * @returns {string|null} Extracted error message or null
   */
  static parseHtmlError(html) {
    // Try multiple strategies to extract error message
    const patterns = [
      /<pre[^>]*>([^<]+(?:<[^>]+>[^<]+)*)<\/pre>/i,  // Error in <pre> tag
      /<h2[^>]*>([^<]+)<\/h2>/i,                      // Error in <h2> tag
      /<div[^>]*class="?exception"?[^>]*>([^<]+)<\/div>/i,  // Exception div
      /<div[^>]*class="?error"?[^>]*>([^<]+)<\/div>/i,      // Error div
      /<title>([^<]+)<\/title>/i,                     // Page title
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted text
        const text = match[1].replace(/<[^>]+>/g, ' ').trim();
        if (text && text.length > 0) {
          return text.substring(0, 200); // Limit length
        }
      }
    }

    return null;
  }

  /**
   * Extract error message from various error formats
   * Handles Error objects, response objects, and plain strings
   * @param {*} error - Error object, response, or string
   * @returns {Promise<string>} User-friendly error message
   */
  static async extractErrorMessage(error) {
    // If it's already a string, return it
    if (typeof error === 'string') {
      return error;
    }

    // If it's a Response object, parse it
    if (error && typeof error.response === 'object' && error.response.status) {
      return await this.parseErrorResponse(error.response);
    }

    // If it has a message property, use it
    if (error && error.message) {
      return error.message;
    }

    // If it has a response property (another-rest-client style)
    if (error && error.response) {
      try {
        const parsed = await this.parseErrorResponse(error.response);
        return parsed.message;
      } catch (e) {
        // Fall through
      }
    }

    // Default fallback
    return 'An unexpected error occurred';
  }

  /**
   * Format error message for display to user
   * Removes technical details and makes it user-friendly
   * @param {string} errorMessage - Raw error message
   * @returns {string} User-friendly error message
   */
  static formatUserMessage(errorMessage) {
    // Remove common technical prefixes
    const cleaned = errorMessage
      .replace(/^Error: /i, '')
      .replace(/^Request failed with status \d+: /i, '')
      .replace(/Action Controller: Exception caught/i, 'Server error')
      .trim();

    // If it's still too technical, provide a generic message
    if (cleaned.length > 200 || cleaned.includes('at ') || cleaned.includes('stack trace')) {
      return 'An error occurred while processing your request. Please try again.';
    }

    return cleaned;
  }

  /**
   * Handle and log an error
   * @param {*} error - The error to handle
   * @param {string} context - Context where the error occurred
   * @returns {Promise<string>} User-friendly error message
   */
  static async handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    const message = await this.extractErrorMessage(error);
    const userMessage = this.formatUserMessage(message);
    
    console.error(`User-friendly error message: ${userMessage}`);
    
    return userMessage;
  }
}

