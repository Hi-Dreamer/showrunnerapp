const initialState = {
  shows: [],
  activeShows: [],
  expiredShows: [],
  currentShow: null,
  venues: [],
  hiModules: [],
  loading: false,
  loadingExpired: false,
  error: null,
};

const showReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SHOWS_LOAD_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'SHOWS_LOAD_SUCCESS':
      return {
        ...state,
        shows: action.payload,
        activeShows: action.payload,
        loading: false,
        error: null,
      };
    case 'SHOWS_LOAD_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'EXPIRED_SHOWS_LOAD_START':
      return {
        ...state,
        loadingExpired: true,
        error: null,
      };
    case 'EXPIRED_SHOWS_LOAD_SUCCESS':
      return {
        ...state,
        expiredShows: action.payload,
        loadingExpired: false,
        error: null,
      };
    case 'EXPIRED_SHOWS_LOAD_FAILURE':
      return {
        ...state,
        loadingExpired: false,
        error: action.payload,
      };
    case 'SHOW_SET_CURRENT':
      return {
        ...state,
        currentShow: action.payload,
      };
    case 'SHOW_SET_VENUES':
      return {
        ...state,
        venues: action.payload,
      };
    case 'SHOW_SET_HI_MODULES':
      return {
        ...state,
        hiModules: action.payload,
      };
    default:
      return state;
  }
};

export default showReducer;

