import { createSlice, createSelector } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import { truncateAddress } from "../lib/utils"
// import { getContract } from "./utils/contract-utils"
import DAOs from "../static/DAOs.json"
import delegates from "../static/delegates.json"
import eligibles from "../static/eligibles.json"

// const newBalanceTree = new BalanceTree(balances)

export interface DAO {
  address: string
  name: string
  avatar: string
}

export interface Delegate {
  address: string
  ensName: string
  applicationLink: string
  avatar?: string
  truncatedAddress?: string
}

interface ClaimingState {
  status: string
  claimed: {
    [address: string]: boolean
  }
  distributor: any
  delegates: Delegate[]
  eligibles: {
    address: string
    earnings: string
    reasons: string
  }[]
  DAOs: DAO[]
  selectedDAO: DAO | null
  selectedDelegate: Delegate | null
}

const getDistributorContract = async () => {
  // const contractAddress = "0x1234"
  // const distributor = await getContract(contractAddress, DISTRIBUTOR_ABI)
  // return distributor
}

const claim = createBackgroundAsyncThunk(
  "claim/distributorClaim",
  async (
    {
      account,
      referralCode,
    }: {
      account: string
      referralCode?: string
    },
    { getState }
  ) => {
    // const state: any = getState()
    // if (state.claimed[account]) {
    //   throw new Error("already claimed")
    // }
    // const { index, balance } = await findIndexAndBalance(account)
    // const proof = getProof(index, account, balance)
    // const distributor = await getDistributorContract()
    // if (!referralCode) {
    //   const tx = await distributor.claim(index, account, balance, proof)
    //   const receipt = await tx.wait()
    //   return receipt
    // }
    // const tx = await distributor.claimWithCommunityCode(
    //   index,
    //   account,
    //   balance,
    //   proof,
    //   referralCode
    // )
    // const receipt = await tx.wait()
    // return receipt
  }
)

const initialState = {
  status: "idle",
  claimed: {},
  distributor: {},
  selectedDAO: null,
  selectedDelegate: null,
  delegates,
  DAOs,
  eligibles: eligibles.map((item): Eligibles => {
    return { ...item, earnings: BigInt(item.earnings) }
  }),
} as ClaimingState

const claimingSlice = createSlice({
  name: "claim",
  initialState,
  reducers: {
    chooseDAO: (immerState, { payload: DAO }) => {
      immerState.selectedDAO = DAO
    },
    chooseDelegate: (immerState, { payload: delegate }) => {
      immerState.selectedDelegate = delegate
    },
  },
  extraReducers: (builder) => {
    builder.addCase(claim.pending, (immerState) => {
      immerState.status = "loading"
    })
    builder.addCase(claim.fulfilled, (immerState, { payload }) => {
      const address: any = { payload }
      immerState.status = "success"
      immerState.claimed[address] = true
    })
    builder.addCase(claim.rejected, (immerState) => {
      immerState.status = "rejected"
    })
  },
})

export const { chooseDAO, chooseDelegate } = claimingSlice.actions

export default claimingSlice.reducer

export const selectClaim = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState
)

export const selectClaimSelections = createSelector(
  selectClaim,
  (claimState: ClaimingState) => {
    return {
      selectedDelegate: {
        ...claimState.selectedDelegate,
        truncatedAddress: truncateAddress(
          claimState?.selectedDelegate?.address ?? ""
        ),
      },
      selectedDAO: claimState.selectedDAO,
    }
  }
)
