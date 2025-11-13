/**
 * API endpoint constants
 * Centralized location for all API endpoint definitions
 */

// Use your development machine's IP address instead of localhost
// When running on a physical device or simulator, localhost refers to the device, not your dev machine
export const API_BASE_URL = 'http://192.168.1.84:3000';

export const API_ENDPOINTS = {
  // Authentication
  SIGN_IN: `${API_BASE_URL}/users/sign_in`,
  SIGN_OUT: `${API_BASE_URL}/users/sign_out`,
  CURRENT_USER: `${API_BASE_URL}/users/me`,

  // Shows
  SHOWS: `${API_BASE_URL}/shows`,
  SHOW: (id) => `${API_BASE_URL}/shows/${id}`,
  ADD_CUSTOM_MESSAGE: (showId) => `${API_BASE_URL}/shows/${showId}/add_custom_message`,
  DESTROY_REMOVED_MESSAGES: (showId) => `${API_BASE_URL}/shows/${showId}/destroy_removed_messages`,

  // Venues
  VENUES: `${API_BASE_URL}/venues`,

  // Performers
  PERFORMERS: `${API_BASE_URL}/performers`,

  // HI Modules
  HI_MODULES: `${API_BASE_URL}/hi_modules`,

  // Run Show
  RUN_SHOW: (showId) => `${API_BASE_URL}/shows/${showId}/run`,
  SET_SHOW_STATE: (showId) => `${API_BASE_URL}/shows/${showId}/set_state`,
  RESET_PICKS: (showId) => `${API_BASE_URL}/shows/${showId}/reset_picks`,
  SET_TIMES: (showId) => `${API_BASE_URL}/shows/${showId}/set_times`,
  
  // Channels
  CHANNEL: (id) => `${API_BASE_URL}/channels/${id}`,
};

