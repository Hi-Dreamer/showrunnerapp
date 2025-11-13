import ApiService from '../services/api';
import { API_BASE_URL } from '../constants/apiEndpoints';
import CsrfTokenService from '../services/csrfTokenService';
import { ErrorHandler } from '../utils/errorHandler';

export const showsLoadStart = () => ({
  type: 'SHOWS_LOAD_START',
});

export const showsLoadSuccess = (shows) => ({
  type: 'SHOWS_LOAD_SUCCESS',
  payload: shows,
});

export const showsLoadFailure = (error) => ({
  type: 'SHOWS_LOAD_FAILURE',
  payload: error,
});

export const setCurrentShow = (show) => ({
  type: 'SHOW_SET_CURRENT',
  payload: show,
});

export const setVenues = (venues) => ({
  type: 'SHOW_SET_VENUES',
  payload: venues,
});

export const setHiModules = (hiModules) => ({
  type: 'SHOW_SET_HI_MODULES',
  payload: hiModules,
});

export const loadShows = (dateFilter = 'upcoming', page = 1) => {
  return async (dispatch) => {
    dispatch(showsLoadStart());
    try {
      const api = ApiService.getClient();
      const shows = await api.shows.get({ date_filter: dateFilter, page });
      dispatch(showsLoadSuccess(shows));
    } catch (error) {
      dispatch(showsLoadFailure(error.message));
    }
  };
};

export const expiredShowsLoadStart = () => ({
  type: 'EXPIRED_SHOWS_LOAD_START',
});

export const expiredShowsLoadSuccess = (shows) => ({
  type: 'EXPIRED_SHOWS_LOAD_SUCCESS',
  payload: shows,
});

export const expiredShowsLoadFailure = (error) => ({
  type: 'EXPIRED_SHOWS_LOAD_FAILURE',
  payload: error,
});

export const loadExpiredShows = (page = 1) => {
  return async (dispatch) => {
    dispatch(expiredShowsLoadStart());
    try {
      const api = ApiService.getClient();
      // Use 'past' as the date_filter to match the web interface's "Past Shows" tab
      const shows = await api.shows.get({ date_filter: 'past', page });
      dispatch(expiredShowsLoadSuccess(shows));
    } catch (error) {
      dispatch(expiredShowsLoadFailure(error.message));
    }
  };
};

export const loadShow = (showId) => {
  return async (dispatch) => {
    try {
      const api = ApiService.getClient();
      const show = await api.shows(showId).get();
      dispatch(setCurrentShow(show));
      return show;
    } catch (error) {
      console.error('Load show error:', error);
      throw error;
    }
  };
};

export const createShow = (showData) => {
  return async (dispatch) => {
    try {
      const api = ApiService.getClient();
      // Get CSRF token first - try to extract from response, otherwise refresh
      const tokenResponse = await api.shows('new').get();
      const token = await CsrfTokenService.extractFromShow(tokenResponse);
      if (!token) {
        await CsrfTokenService.refreshToken();
      }
      
      // Clean up the data - ensure null values are handled correctly
      // IMPORTANT: Preserve hi_modules - Rails requires it for show creation
      // Also preserve dates and other fields that might be set on Page 1
      const cleanData = {
        ...showData,
        venue_id: showData.venue_id > 0 ? showData.venue_id : null,
        code: showData.code || null,
        performer_ids: showData.performer_ids && showData.performer_ids.length > 0 ? showData.performer_ids : null,
        // Preserve hi_modules - required by Rails controller
        hi_modules: showData.hi_modules || [],
        // Preserve dates if provided (from Page 1)
        show_datetime: showData.show_datetime || null,
        show_end_datetime: showData.show_end_datetime || null,
        // Preserve TV settings if provided
        tv_theme: showData.tv_theme || 'light',
        tv_score_visible: showData.tv_score_visible !== undefined ? showData.tv_score_visible : false,
      };
      
      // Ensure we have a fresh CSRF token before creating
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      
      // Manually construct POST request to ensure CSRF token is included
      // Similar to updateShow and deleteShow, we use fetch directly for better control
      const headers = await CsrfTokenService.getHeaders(csrfToken);
      const response = await fetch(`${API_BASE_URL}/shows`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorInfo = await ErrorHandler.parseErrorResponse(response);
        throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
      }

      const show = await response.json();
      dispatch(setCurrentShow(show));
      // Reload both active and expired shows lists
      dispatch(loadShows('upcoming'));
      dispatch(loadExpiredShows());
      return { success: true, show };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'createShow');
      return { success: false, error: errorMessage };
    }
  };
};

export const updateShow = (showId, showData) => {
  return async (dispatch) => {
    try {
      const api = ApiService.getClient();
      
      // Clean up the data - ensure performer_ids is a proper array or null
      const cleanData = {
        ...showData,
        venue_id: showData.venue_id > 0 ? showData.venue_id : null,
        code: showData.code || null,
      };
      
      // Handle performer_ids - ensure it's an array, not an object
      if (showData.performer_ids && Array.isArray(showData.performer_ids) && showData.performer_ids.length > 0) {
        cleanData.performer_ids = showData.performer_ids;
      } else {
        cleanData.performer_ids = null;
      }
      
      // Include hi_modules/hi_module_ids if provided (for updating modules on existing shows)
      // Backend might expect hi_module_ids instead of hi_modules for updates
      // Try both to ensure compatibility
      const modulesToUpdate = showData.hi_modules !== undefined ? showData.hi_modules : showData.hi_module_ids;
      
      if (modulesToUpdate !== undefined) {
        if (Array.isArray(modulesToUpdate) && modulesToUpdate.length > 0) {
          // Try both parameter names - backend might expect hi_module_ids
          cleanData.hi_module_ids = modulesToUpdate;
          cleanData.hi_modules = modulesToUpdate;
        } else if (Array.isArray(modulesToUpdate)) {
          // Empty array - still include it
          cleanData.hi_module_ids = [];
          cleanData.hi_modules = [];
        } else {
          // Not an array - convert to array if possible, otherwise empty array
          cleanData.hi_module_ids = [];
          cleanData.hi_modules = [];
        }
      }
      
      // Ensure boolean values are actual booleans, not strings
      if (showData.tv_score_visible !== undefined) {
        cleanData.tv_score_visible = showData.tv_score_visible === true || showData.tv_score_visible === 'true';
      }
      
      // Ensure we have a fresh CSRF token before making the request
      // Try to get it from the show response first (it includes form_authenticity_token)
      try {
        const showResponse = await api.shows(showId).get();
        const token = await CsrfTokenService.extractFromShow(showResponse);
        if (!token) {
          // Fall back to refresh method
          await CsrfTokenService.refreshToken();
        }
      } catch (csrfError) {
        console.warn('Failed to get CSRF token from show, trying refresh:', csrfError);
        await CsrfTokenService.refreshToken();
      }
      
      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - server took too long to respond')), 30000);
      });

      // Manually serialize as JSON for PUT requests to ensure arrays are sent correctly
      // another-rest-client might try to use multipart, so we'll override the request
      // Get fresh CSRF token first, then construct the request
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      const headers = await CsrfTokenService.getHeaders(csrfToken);
      
      const updatePromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${API_BASE_URL}/shows/${showId}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        if (headers['X-CSRF-Token']) {
          xhr.setRequestHeader('X-CSRF-Token', headers['X-CSRF-Token']);
        }
        xhr.withCredentials = true;
        xhr.timeout = 30000;
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              // Check if response contains errors (Rails validation errors)
              if (response.errors && Object.keys(response.errors).length > 0) {
                // Extract first error message
                const firstErrorKey = Object.keys(response.errors)[0];
                const firstError = Array.isArray(response.errors[firstErrorKey]) 
                  ? response.errors[firstErrorKey][0] 
                  : response.errors[firstErrorKey];
                const error = new Error(firstError || 'Validation error');
                error.response = { status: xhr.status, data: xhr.responseText };
                reject(error);
                return;
              }
              // Check if response has an error field
              if (response.error) {
                const error = new Error(response.error);
                error.response = { status: xhr.status, data: xhr.responseText };
                reject(error);
                return;
              }
              resolve(response);
            } catch (e) {
              console.error('Failed to parse JSON response:', xhr.responseText.substring(0, 200));
              reject(new Error('Invalid JSON response'));
            }
          } else {
            // Parse error response using ErrorHandler
            const errorResponse = {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: { get: () => 'application/json' },
              text: async () => xhr.responseText,
            };
            ErrorHandler.parseErrorResponse(errorResponse).then(errorInfo => {
              const error = new Error(ErrorHandler.formatUserMessage(errorInfo.message));
              error.response = { status: xhr.status, data: xhr.responseText };
              reject(error);
            }).catch(e => {
              // Fallback if parsing fails
              const error = new Error(xhr.statusText || `Request failed with status ${xhr.status}`);
              error.response = { status: xhr.status, data: xhr.responseText };
              reject(error);
            });
          }
        };
        
        xhr.onerror = () => {
          console.error('XMLHttpRequest error:', xhr.status, xhr.statusText);
          reject(new Error('Network error'));
        };
        xhr.ontimeout = () => {
          console.error('XMLHttpRequest timeout');
          reject(new Error('Request timeout'));
        };
        
        // Send JSON stringified data
        // Rails typically expects flat JSON for API endpoints (not nested under 'show')
        const jsonBody = JSON.stringify(cleanData);
        xhr.send(jsonBody);
      });
      const show = await Promise.race([updatePromise, timeoutPromise]);
      
      dispatch(setCurrentShow(show));
      // Reload both active and expired shows lists
      dispatch(loadShows('upcoming'));
      dispatch(loadExpiredShows());
      return { success: true, show };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'updateShow');
      return { success: false, error: errorMessage };
    }
  };
};

export const deleteShow = (showId) => {
  return async (dispatch) => {
    try {
      // Ensure we have a fresh CSRF token before deleting
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      
      // Manually construct DELETE request to ensure CSRF token is included
      // Similar to updateShow, we use fetch directly for better control
      const response = await fetch(`${API_BASE_URL}/shows/${showId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await CsrfTokenService.getHeaders(csrfToken),
      });

      if (!response.ok) {
        const errorInfo = await ErrorHandler.parseErrorResponse(response);
        throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
      }

      const result = await response.json();
      
      // Reload both active and expired shows lists
      dispatch(loadShows('upcoming'));
      dispatch(loadExpiredShows());
      return { success: true };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'deleteShow');
      return { success: false, error: errorMessage };
    }
  };
};

export const copyShow = (showId) => {
  return async (dispatch) => {
    try {
      // Load the show to copy
      const show = await dispatch(loadShow(showId));
      if (!show) {
        throw new Error('Show not found');
      }

      // Prepare data for the new show (copy all fields except id)
      const { id, created_at, updated_at, ...showData } = show;
      
      // Modify the name to indicate it's a copy
      const copyData = {
        ...showData,
        name: `${showData.name} (Copy)`,
      };

      // Create the new show using createShow action
      const result = await dispatch(createShow(copyData));
      
      if (result.success) {
        return { success: true, show: result.show };
      } else {
        throw new Error(result.error || 'Failed to copy show');
      }
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'copyShow');
      return { success: false, error: errorMessage };
    }
  };
};

export const loadVenues = () => {
  return async (dispatch) => {
    try {
      const api = ApiService.getClient();
      const venues = await api.venues.get();
      dispatch(setVenues(venues));
    } catch (error) {
      console.error('Load venues error:', error);
    }
  };
};

export const loadHiModules = () => {
  return async (dispatch) => {
    try {
      const api = ApiService.getClient();
      const hiModules = await api.hi_modules.get();
      dispatch(setHiModules(hiModules));
    } catch (error) {
      console.error('Load hi_modules error:', error);
    }
  };
};
