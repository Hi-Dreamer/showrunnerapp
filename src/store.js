import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './reducers/auth';
import showReducer from './reducers/show';

const rootReducer = combineReducers({
  auth: authReducer,
  show: showReducer,
});

export const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

