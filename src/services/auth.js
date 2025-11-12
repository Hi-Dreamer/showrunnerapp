import ApiService from './api';
import CsrfTokenService from './csrfTokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your development machine's IP address instead of localhost
// When running on a physical device or simulator, localhost refers to the device, not your dev machine
import { API_BASE_URL } from '../constants/apiEndpoints';

class AuthService {
  // Extract CSRF token from HTML response (delegates to CsrfTokenService)
  extractCsrfToken(html) {
    // This method is kept for backward compatibility
    // The actual extraction is now handled by CsrfTokenService
    const match = html.match(/name="csrf-token" content="([^"]+)"/);
    return match ? match[1] : null;
  }

  // Check if response is JSON
  isJsonResponse(response) {
    const contentType = response.headers.get('content-type');
    return contentType && contentType.includes('application/json');
  }

  async login(email, password) {
    try {
      // First, check if already logged in
      try {
        const checkResponse = await fetch(`${API_BASE_URL}/users/me`, {
          credentials: 'include',
        });
        if (checkResponse.ok && this.isJsonResponse(checkResponse)) {
          const user = await checkResponse.json();
          return { success: true, user };
        }
      } catch (e) {
        // Not logged in, proceed with login
      }

      // Build login request body - Devise expects user[email] and user[password]
      // Manually construct the form-encoded string to ensure it's correct
      const emailEncoded = encodeURIComponent(email.trim().toLowerCase());
      const passwordEncoded = encodeURIComponent(password);
      const bodyString = `user[email]=${emailEncoded}&user[password]=${passwordEncoded}&user[remember_me]=1`;

      // Attempt login - CSRF is skipped for sessions create/destroy per application_controller
      try {
        const loginResponse = await fetch(`${API_BASE_URL}/users/sign_in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
          },
          credentials: 'include',
          redirect: 'manual',
          body: bodyString,
        });

        // Check if login was successful
        // Devise returns 302 redirect on success, or 200 if already logged in
        // 401 means invalid credentials
        if (loginResponse.status === 401) {
          return { success: false, error: 'Invalid email or password. Please check your credentials.' };
        }

        if (loginResponse.ok || loginResponse.status === 302 || loginResponse.status === 303) {
          // Success - wait a moment for session to be set, then get user info
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (userResponse.ok && this.isJsonResponse(userResponse)) {
            const user = await userResponse.json();
            await AsyncStorage.setItem('user_session', JSON.stringify(user));
            
            // Get CSRF token from a show request for future API calls
            try {
              const showsResponse = await fetch(`${API_BASE_URL}/shows/new`, {
                credentials: 'include',
                headers: {
                  'Accept': 'application/json',
                },
              });
              if (showsResponse.ok && this.isJsonResponse(showsResponse)) {
                const showData = await showsResponse.json();
                await CsrfTokenService.extractFromShow(showData);
              }
            } catch (e) {
              // Try to refresh token as fallback
              await CsrfTokenService.refreshToken();
            }
            
            return { success: true, user };
          } else {
            // Got HTML instead of JSON
            return { success: false, error: 'Login failed - could not get user info' };
          }
        } else {
          // Unexpected status
          return { success: false, error: `Login failed - status ${loginResponse.status}` };
        }
      } catch (fetchError) {
        console.error('Fetch error during login:', fetchError);
        return { success: false, error: fetchError.message || 'Network error during login' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  async logout() {
    try {
      await fetch(`${API_BASE_URL}/users/sign_out`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await ApiService.clearAuth();
      await AsyncStorage.removeItem('user_session');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const userJson = await AsyncStorage.getItem('user_session');
      if (userJson) {
        return JSON.parse(userJson);
      }
      
      // Try to fetch from API
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        credentials: 'include',
      });
      
      // Check if response is JSON before parsing
      if (response.ok && this.isJsonResponse(response)) {
        const user = await response.json();
        await AsyncStorage.setItem('user_session', JSON.stringify(user));
        return user;
      }
      
      // If we get HTML, we're not authenticated
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return user !== null;
  }
}

export default new AuthService();

