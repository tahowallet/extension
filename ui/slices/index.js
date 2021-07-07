import { combineReducers } from 'redux';

import accountReducer from './account';

const rootReducer = combineReducers({
  account: accountReducer,
});

export default rootReducer;
