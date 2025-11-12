import AuthService from '../services/auth';

export const loginStart = () => ({
  type: 'AUTH_LOGIN_START',
});

export const loginSuccess = (user) => ({
  type: 'AUTH_LOGIN_SUCCESS',
  payload: user,
});

export const loginFailure = (error) => ({
  type: 'AUTH_LOGIN_FAILURE',
  payload: error,
});

export const logout = () => ({
  type: 'AUTH_LOGOUT',
});

export const setUser = (user) => ({
  type: 'AUTH_SET_USER',
  payload: user,
});

export const loginUser = (email, password) => {
  return async (dispatch) => {
    dispatch(loginStart());
    const result = await AuthService.login(email, password);
    if (result.success) {
      dispatch(loginSuccess(result.user));
    } else {
      dispatch(loginFailure(result.error));
    }
    return result;
  };
};

export const logoutUser = () => {
  return async (dispatch) => {
    await AuthService.logout();
    dispatch(logout());
  };
};

export const checkAuth = () => {
  return async (dispatch) => {
    const user = await AuthService.getCurrentUser();
    if (user) {
      dispatch(setUser(user));
    } else {
      dispatch(logout());
    }
  };
};

