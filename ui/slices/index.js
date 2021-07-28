import { combineReducers } from 'redux';

import accountReducer from './account';
import uiReducer from './ui';

const rootReducer = combineReducers({
  account: accountReducer,
  ui: uiReducer,
});

export default rootReducer;
