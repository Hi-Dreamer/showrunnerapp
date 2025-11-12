import RestClient from 'another-rest-client';
import CsrfTokenService from './csrfTokenService';
import { API_BASE_URL } from '../constants/apiEndpoints';

class ApiService {
  constructor() {
    this.client = new RestClient(API_BASE_URL);
    this.setupResources();
    this.setupInterceptors();
  }

  setupResources() {
    // Define API resources
    this.client.res('users');
    this.client.res({shows: ['set_state', 'set_times', 'pages', 'add_custom_message', 'destroy_removed_messages']});
    this.client.res('venues');
    this.client.res('hi_modules');
    this.client.res('performers');
    this.client.res('votes');
    this.client.res('picks');
    this.client.res('server_time');
    this.client.res('check_show_date');
    this.client.res('check_code');
    
    // Configure multipart/form-data encoder
    // The web app uses multipart/form-data as default for add_custom_message
    // We configure the encoder but don't set a default contentType
    // The interceptor will handle setting Content-Type appropriately
    this.client.conf({
      encodings: {
        'multipart/form-data': {
          encode: (params) => {
            return this.objectToFormData(params);
          }
        }
      }
    });
    
    // For add_custom_message requests, we need to force multipart encoding
    // We'll do this by checking the URL in the interceptor and not setting Content-Type to JSON
  }

  // Helper to convert object to FormData (for file uploads)
  objectToFormData(obj, formData = new FormData(), parentKey = '') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const formKey = parentKey ? `${parentKey}[${key}]` : key;

        if (value === null || value === undefined) {
          // For Rails, we might need to send empty strings instead of skipping
          // But let's try skipping first and see if that's the issue
          continue;
        } else if (value instanceof File || (value && value.uri)) {
          // Handle file objects (React Native file format)
          if (value.uri) {
            // React Native file format: { uri, type, name }
            formData.append(formKey, {
              uri: value.uri,
              type: value.type || 'image/jpeg',
              name: value.name || 'image.jpg',
            });
          } else {
            formData.append(formKey, value);
          }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively handle nested objects
          this.objectToFormData(value, formData, formKey);
        } else if (Array.isArray(value)) {
          // Handle arrays
          value.forEach((item, index) => {
            if (item instanceof File || (item && item.uri)) {
              formData.append(`${formKey}[${index}]`, item.uri ? {
                uri: item.uri,
                type: item.type || 'image/jpeg',
                name: item.name || 'image.jpg',
              } : item);
            } else if (typeof item === 'object') {
              this.objectToFormData(item, formData, `${formKey}[${index}]`);
            } else {
              formData.append(`${formKey}[${index}]`, item);
            }
          });
        } else {
          formData.append(formKey, value);
        }
      }
    }
    return formData;
  }

  async setupInterceptors() {
    this.client.on('request', async (xhr) => {
      // Always request JSON responses
      xhr.setRequestHeader('Accept', 'application/json');
      
      // Determine if this is a file upload request (has file objects in the data)
      // For file uploads, we'll set multipart/form-data in the request
      // For all other requests (PUT, PATCH, POST without files), use JSON
      const isFileUpload = xhr._method === 'POST' && 
                          (xhr._url.includes('add_custom_message') || 
                           xhr._url.includes('sponsor_logo'));
      
      // For file uploads (add_custom_message), use multipart/form-data
      // The web app always uses multipart for add_custom_message, so we should too
      if (isFileUpload) {
        // Don't set Content-Type header - let the browser set it with boundary
        // But ensure another-rest-client uses multipart encoding
        // The multipart encoder will be used automatically when Content-Type isn't set to JSON
      } else {
        // For non-file uploads, explicitly use JSON content type
        // This ensures arrays are serialized correctly as JSON arrays, not form data objects
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
      
      // Get CSRF token using the centralized service
      const token = await CsrfTokenService.getToken();
      
      // Include CSRF token if available
      if (token) {
        xhr.setRequestHeader('X-CSRF-Token', token);
      } else {
        console.warn('No CSRF token available for request');
      }
      // Include credentials for session cookies
      xhr.withCredentials = true;
      
      // Add timeout to XMLHttpRequest (30 seconds)
      xhr.timeout = 30000;
      
      // Log timeout
      xhr.addEventListener('timeout', () => {
        console.error('API Request timeout:', xhr._method, xhr._url);
      });
      
      // Log errors
      xhr.addEventListener('error', () => {
        console.error('API Request error:', xhr._method, xhr._url);
      });
    });
  }

  // Delegate CSRF token methods to CsrfTokenService
  async setCsrfToken(token) {
    await CsrfTokenService.setToken(token);
  }

  async refreshCsrfToken() {
    return await CsrfTokenService.refreshToken();
  }

  async clearAuth() {
    await CsrfTokenService.clearToken();
    // Note: user_session clearing would be handled by auth service
  }

  getClient() {
    return this.client;
  }
}

export default new ApiService();

