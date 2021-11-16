import { createSlice } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"
import { DISTRIBUTOR_ABI } from "../constants/abi"
import balances from "../constants/balances"
import BalanceTree from "../lib/balance-tree"
import { createBackgroundAsyncThunk } from "./utils"
import { createFetchContractThunk, getContract } from "./utils/contract-utils"

const newBalanceTree = new BalanceTree(balances)

declare global {
  interface Window {
    ethereum: any
  }
}

interface ClaimingState {
  status: string
  claimed: {
    [address: string]: boolean
  }
  distributor: any
}

const findIndexAndBalance = (address: string) => {
  const index = balances.findIndex((el) => address === el.account)
  const balance = balances[index].amount
  return { index, balance }
}

const getDistributorContract = async () => {
  const contractAddress = "0x123"
  const distributor = await getContract(contractAddress, DISTRIBUTOR_ABI)
  return distributor
}

const getProof = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber
) => {
  newBalanceTree.getProof(index, account, amount)
}

// An example usage of how we can get a contract instance but imo uncessary
const fetchDistributorContract = createFetchContractThunk(
  "distributor",
  DISTRIBUTOR_ABI
)

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
    const state: any = getState()
    if (state.claimed[account]) {
      throw new Error("already claimed")
    }
    const { index, balance } = await findIndexAndBalance(account)
    const proof = getProof(index, account, balance)
    const distributor = await getDistributorContract()
    if (!referralCode) {
      const tx = await distributor.claim(index, account, balance, proof)
      const receipt = await tx.wait()
      return receipt
    }
    const tx = await distributor.claimWithCommunityCode(
      index,
      account,
      balance,
      proof,
      referralCode
    )
    const receipt = await tx.wait()
    return receipt
  }
)

const initialState = {
  status: "idle",
  claimed: {},
  distributor: {},
} as ClaimingState

const claimingSlice = createSlice({
  name: "claim",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      fetchDistributorContract.fulfilled,
      (immerState, { payload }) => {
        immerState.distributor = payload
      }
    )
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

export default claimingSlice.reducer
