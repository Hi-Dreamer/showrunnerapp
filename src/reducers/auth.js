const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'AUTH_LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case 'AUTH_LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };
    case 'AUTH_SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
      };
    default:
      return state;
  }
};

export default authReducer;

