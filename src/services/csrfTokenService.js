import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/apiEndpoints';

/**
 * Centralized CSRF token management service
 * Handles token storage, retrieval, and refresh for Rails CSRF protection
 */
class CsrfTokenService {
  constructor() {
    this.STORAGE_KEY = 'csrf_token';
  }

  /**
   * Get the current CSRF token from storage
   * @returns {Promise<string|null>} The CSRF token or null if not found
   */
  async getToken() {
    return await AsyncStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Store a CSRF token
   * @param {string} token - The CSRF token to store
   */
  async setToken(token) {
    await AsyncStorage.setItem(this.STORAGE_KEY, token);
  }

  /**
   * Remove the CSRF token from storage
   */
  async clearToken() {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Refresh the CSRF token from the server
   * Tries multiple strategies to get a fresh token
   * @returns {Promise<string|null>} The new CSRF token or null if failed
   */
  async refreshToken() {
    try {
      // Strategy 1: Try to get token from a JSON endpoint (like /shows)
      try {
        const response = await fetch(`${API_BASE_URL}/shows?date_filter=upcoming&page=1`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Some endpoints include form_authenticity_token in the response
          if (data.form_authenticity_token) {
            await this.setToken(data.form_authenticity_token);
            return data.form_authenticity_token;
          }
        }
      } catch (e) {
        console.warn('Failed to get CSRF token from JSON endpoint:', e);
      }

      // Strategy 2: Parse HTML from sign-in page
      try {
        const response = await fetch(`${API_BASE_URL}/users/sign_in`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'text/html',
          },
        });

        if (response.ok) {
          const html = await response.text();
          const match = html.match(/name="csrf-token" content="([^"]+)"/);
          if (match && match[1]) {
            const newToken = match[1];
            await this.setToken(newToken);
            return newToken;
          }
        }
      } catch (e) {
        console.warn('Failed to get CSRF token from HTML:', e);
      }

      console.error('Failed to refresh CSRF token using all strategies');
      return null;
    } catch (error) {
      console.error('Error refreshing CSRF token:', error);
      return null;
    }
  }

  /**
   * Ensure we have a fresh CSRF token
   * Refreshes if token is missing or if forceRefresh is true
   * @param {boolean} forceRefresh - Force refresh even if token exists
   * @returns {Promise<string>} The CSRF token (throws if cannot get one)
   */
  async ensureFreshToken(forceRefresh = false) {
    let token = await this.getToken();

    if (!token || forceRefresh) {
      token = await this.refreshToken();
      if (!token) {
        throw new Error('Failed to obtain CSRF token');
      }
    }

    return token;
  }

  /**
   * Get headers with CSRF token for API requests
   * @param {string|null} token - Optional token to use (if not provided, gets from storage)
   * @returns {Promise<Object>} Headers object with X-CSRF-Token
   */
  async getHeaders(token = null) {
    const csrfToken = token || await this.getToken();
    const headers = {
      'Accept': 'application/json',
    };

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }

  /**
   * Add CSRF token to FormData for multipart requests
   * @param {FormData} formData - The FormData object to add token to
   * @param {string|null} token - Optional token to use (if not provided, gets from storage)
   */
  async addToFormData(formData, token = null) {
    const csrfToken = token || await this.getToken();
    if (csrfToken) {
      formData.append('authenticity_token', csrfToken);
    }
  }

  /**
   * Get CSRF token from a show object (if it includes form_authenticity_token)
   * @param {Object} show - Show object that may contain form_authenticity_token
   * @returns {Promise<string|null>} The token if found, null otherwise
   */
  async extractFromShow(show) {
    if (show && show.form_authenticity_token) {
      await this.setToken(show.form_authenticity_token);
      return show.form_authenticity_token;
    }
    return null;
  }
}

export default new CsrfTokenService();

