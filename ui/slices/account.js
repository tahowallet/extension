import { createSlice } from '@reduxjs/toolkit';
import { connectToBackgroundApi } from '@tallyho/tally-api';

const api = connectToBackgroundApi('ui')

export const initialState = {
  accountLoading: false,
  hasAccountError: false,
  account: undefined,
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    loadAccount: (state) => {
      state.accountLoading = true;
    },
    loadAccountSuccess: (state, { payload }) => {
      state.account = payload;
      state.accountLoading = false;
    },
    loadAccountFailure: (state) => {
      state.accountLoading = false;
      state.hasAccountError = true;
    },
  },
});

export const { loadAccount, loadAccountSuccess, loadAccountFailure } =
  accountSlice.actions;
export const accountSelector = (state) => state.account;
export default accountSlice.reducer;

export function fetchAccount(address) {
  return async (dispatch) => {
    dispatch(loadAccount());

    try {
      let account = await api.send({
        method: 'GET',
        route: `/accounts/${address}`,
      });

      // Temporarily fill in hard coded USD conversion
      if (account?.total_balance?.amount) {
        const usdAmount = (
          account?.total_balance?.amount * 2411.44
        ).toLocaleString('en-US', {
          maximumFractionDigits: 2,
        });
        account.total_balance.usd_amount = usdAmount;
        account.tokens[0].usd_balance = usdAmount;
      }

      dispatch(loadAccountSuccess(account));
    } catch (error) {
      dispatch(loadAccountFailure());
    }
  };
}
