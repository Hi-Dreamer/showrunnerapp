import ApiService from '../services/api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import CsrfTokenService from '../services/csrfTokenService';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Run Show Actions
 * Handles all actions for the Run Show interface
 */

export const runShowLoadStart = () => ({
  type: 'RUN_SHOW_LOAD_START',
});

export const runShowLoadSuccess = () => ({
  type: 'RUN_SHOW_LOAD_SUCCESS',
});

export const runShowLoadFailure = (error) => ({
  type: 'RUN_SHOW_LOAD_FAILURE',
  payload: error,
});

export const runShowSetState = (state, extraParams) => ({
  type: 'RUN_SHOW_SET_STATE',
  payload: {
    state,
    extraParams: extraParams || {},
  },
});

export const runShowUpdateState = (updates) => ({
  type: 'RUN_SHOW_UPDATE_STATE',
  payload: updates,
});

export const runShowUpdateVotes = (voteCounts) => ({
  type: 'RUN_SHOW_UPDATE_VOTES',
  payload: voteCounts,
});

export const runShowUpdatePicks = (pickCounts) => ({
  type: 'RUN_SHOW_UPDATE_PICKS',
  payload: pickCounts,
});

export const runShowUpdateSetTimes = (setTimes) => ({
  type: 'RUN_SHOW_UPDATE_SET_TIMES',
  payload: setTimes,
});

export const runShowUpdateElapsedTime = (elapsedTime) => ({
  type: 'RUN_SHOW_UPDATE_ELAPSED_TIME',
  payload: elapsedTime,
});

export const runShowReset = () => ({
  type: 'RUN_SHOW_RESET',
});

/**
 * Load all data needed for Run Show interface
 */
export const loadRunShowData = (showId) => {
  return async (dispatch) => {
    dispatch(runShowLoadStart());
    try {
      const api = ApiService.getClient();
      
      // Load hi_modules first (needed for module detection)
      const hiModules = await api.hi_modules.get();
      dispatch({ type: 'SHOW_SET_HI_MODULES', payload: hiModules });
      
      // Load show data
      const show = await api.shows(showId).get();
      
      // Load venue data if show has venue (needed for channel detection)
      if (show.venue_id) {
        try {
          const venue = await api.venues(show.venue_id).get();
          show.venue = venue; // Attach venue to show object
        } catch (error) {
          console.warn('Failed to load venue:', error);
        }
      }
      
      // Load performers
      const performers = await api.performers.get({ show_id: showId });
      
      // Load votes (if voting module enabled)
      let votes = {};
      try {
        const votesData = await api.votes.get({ show_id: showId });
        if (votesData && Array.isArray(votesData)) {
          votesData.forEach(vote => {
            if (!votes[vote.performer_id]) {
              votes[vote.performer_id] = { count: 0, total: 0 };
            }
            votes[vote.performer_id].count += 1;
            votes[vote.performer_id].total += vote.rating || 0;
          });
        }
      } catch (error) {
        console.warn('Failed to load votes:', error);
      }
      
      // Load picks (if voting module enabled)
      let picks = {};
      try {
        const picksData = await api.picks.get({ show_id: showId });
        if (picksData && Array.isArray(picksData)) {
          picksData.forEach(pick => {
            if (!picks[pick.performer_id]) {
              picks[pick.performer_id] = 0;
            }
            picks[pick.performer_id] += 1;
          });
        }
      } catch (error) {
        console.warn('Failed to load picks:', error);
      }
      
      // Initialize state from show data
      const initialState = {
        showState: show.state || null,
        activePerformerId: show.active_performer_id || null,
        activePerformerName: show.active_performer_name || null,
        activePerformerSetStart: show.active_performer_set_start || null,
        activeSlideId: show.active_custom_message_id || null,
        activeSlideName: show.active_custom_message_name || null,
        customMessagesCycling: show.custom_messages_cycling || false,
        votingType: show.voting_type || null,
        pickingType: show.picking_type || 0,
        votingPickOptions: show.voting_pick_options || [],
        drawState: show.draw_state || null,
        drawWinners: show.draw_winners || [],
        optInCount: show.opt_in_count || 0,
        buzzerState: show.buzzer_state || null,
        buzzerWinners: show.buzzer_winners || [],
        buzzerCount: show.buzzer_count || 0,
        audienceCount: show.show_voter_count || 0,
        voteCounts: votes,
        pickCounts: picks,
      };
      
      dispatch(runShowUpdateState(initialState));
      dispatch(runShowLoadSuccess());
      
      return {
        success: true,
        show,
        performers,
      };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'loadRunShowData');
      dispatch(runShowLoadFailure(errorMessage));
      return { success: false, error: errorMessage };
    }
  };
};

/**
 * Set show state (main control action)
 * @param {number} showId - Show ID
 * @param {string} state - State to set: 'messaging', 'performing', 'voting', 'winner', 'draw', 'buzzer'
 * @param {Object} extraParams - Extra parameters for the state (module-specific)
 */
export const setShowState = (showId, state, extraParams = {}) => {
  return async (dispatch) => {
    try {
      // Ensure we have a fresh CSRF token
      // Note: set_state endpoint skips CSRF in Rails, but we'll include it anyway for consistency
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      
      const response = await fetch(API_ENDPOINTS.SET_SHOW_STATE(showId), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          state,
          extra_params: extraParams,
        }),
      });

      if (!response.ok) {
        const errorInfo = await ErrorHandler.parseErrorResponse(response);
        throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
      }

      const result = await response.json();
      
      // Update local state immediately (real-time updates will come via ActionCable)
      // Convert snake_case to camelCase for consistency
      const camelCaseParams = {};
      Object.keys(extraParams).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        camelCaseParams[camelKey] = extraParams[key];
      });
      dispatch(runShowSetState(state, camelCaseParams));
      
      return { success: true, result };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'setShowState');
      return { success: false, error: errorMessage };
    }
  };
};

/**
 * Reset picks (voting control)
 */
export const resetPicks = (showId) => {
  return async (dispatch) => {
    try {
      const csrfToken = await CsrfTokenService.ensureFreshToken();
      
      const response = await fetch(API_ENDPOINTS.RESET_PICKS(showId), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        const errorInfo = await ErrorHandler.parseErrorResponse(response);
        throw new Error(ErrorHandler.formatUserMessage(errorInfo.message));
      }

      const result = await response.json();
      return { success: true, result };
    } catch (error) {
      const errorMessage = await ErrorHandler.handleError(error, 'resetPicks');
      return { success: false, error: errorMessage };
    }
  };
};

