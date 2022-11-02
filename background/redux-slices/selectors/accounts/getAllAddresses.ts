import { createSelector } from "@reduxjs/toolkit"
import getAccountState from "./getAccountState"

const getAllAddresses = createSelector(getAccountState, (account) => [
  ...new Set(
    Object.values(account.accountsData.evm).flatMap((chainAddresses) =>
      Object.keys(chainAddresses)
    )
  ),
])

export default getAllAddresses
