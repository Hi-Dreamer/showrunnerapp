/**
 * Run Show Reducer
 * Manages state for the Run Show interface
 */

const initialState = {
  // Show state
  showState: null, // 'messaging', 'performing', 'voting', 'winner', 'draw', 'buzzer'
  activePerformerId: null,
  activePerformerName: null,
  activePerformerSetStart: null, // Timestamp when performance started
  activeSlideId: null,
  activeSlideName: null,
  customMessagesCycling: false,
  
  // Voting state
  votingType: null, // 'star_rating' or 'pick'
  pickingType: 0, // 0 = lock_in, 1 = fluid
  votingPickOptions: [], // Array of performer IDs
  
  // Draw state
  drawState: null,
  drawWinners: [],
  optInCount: 0,
  
  // Buzzer state
  buzzerState: null,
  buzzerWinners: [],
  buzzerCount: 0,
  
  // Display data (read-only)
  voteCounts: {}, // { performerId: { count, total } } for star rating
  pickCounts: {}, // { performerId: count }
  setTimes: [], // [{ performer_id, set_time }]
  elapsedTime: null, // Elapsed time in milliseconds (for performing state)
  
  // UI state
  loading: false,
  error: null,
};

const runShowReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'RUN_SHOW_LOAD_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'RUN_SHOW_LOAD_SUCCESS':
      return {
        ...state,
        loading: false,
        error: null,
      };

    case 'RUN_SHOW_LOAD_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'RUN_SHOW_SET_STATE':
      // Convert snake_case to camelCase for extraParams
      const camelCaseParams = {};
      if (action.payload.extraParams) {
        Object.keys(action.payload.extraParams).forEach(key => {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          camelCaseParams[camelKey] = action.payload.extraParams[key];
        });
      }
      return {
        ...state,
        showState: action.payload.state,
        ...camelCaseParams,
      };

    case 'RUN_SHOW_UPDATE_STATE':
      // Update from ActionCable
      return {
        ...state,
        ...action.payload,
      };

    case 'RUN_SHOW_UPDATE_VOTES':
      return {
        ...state,
        voteCounts: action.payload,
      };

    case 'RUN_SHOW_UPDATE_PICKS':
      return {
        ...state,
        pickCounts: action.payload,
      };

    case 'RUN_SHOW_UPDATE_SET_TIMES':
      return {
        ...state,
        setTimes: action.payload,
      };

    case 'RUN_SHOW_UPDATE_ELAPSED_TIME':
      return {
        ...state,
        elapsedTime: action.payload,
      };

    case 'RUN_SHOW_RESET':
      return initialState;

    default:
      return state;
  }
};

export default runShowReducer;


