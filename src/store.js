import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './reducers/auth';
import showReducer from './reducers/show';
import runShowReducer from './reducers/runShow';

const rootReducer = combineReducers({
  auth: authReducer,
  show: showReducer,
  runShow: runShowReducer,
});

export const store = createStore(
  rootReducer,
  applyMiddleware(thunk)
);

