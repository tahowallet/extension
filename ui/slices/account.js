import { createSlice } from '@reduxjs/toolkit';
import { connectToBackgroundApi } from '@tallyho/tally-api/lib/connect';
const api = connectToBackgroundApi({ name: 'ui' });

export const initialState = {
  accountLoading: false,
  hasAccountError: false,
  account: {},
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    getAccount: (state) => {
      state.accountLoading = true;
    },
    getAccountSuccess: (state, { payload }) => {
      state.account = payload;
      state.accountLoading = false;
    },
    getAccountFailure: (state) => {
      state.accountLoading = false;
      state.hasAccountError = true;
    },
  },
});

export const { getAccount, getAccountSuccess, getAccountFailure } =
  accountSlice.actions;
export const accountSelector = (state) => state.account;
export default accountSlice.reducer;

export function fetchAccount(address) {
  return async (dispatch) => {
    dispatch(getAccount());
    try {
      const response = await api.send({
        method: 'GET',
        route: `/accounts/${address}`,
      });
      dispatch(getAccountSuccess(response));
    } catch (error) {
      dispatch(getAccountFailure());
    }
  };
}
