const initialState = {
  shows: [],
  currentShow: null,
  venues: [],
  hiModules: [],
  loading: false,
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
        loading: false,
        error: null,
      };
    case 'SHOWS_LOAD_FAILURE':
      return {
        ...state,
        loading: false,
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

