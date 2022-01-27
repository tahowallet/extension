import { createSlice } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"
import DISTRIBUTOR_ABI from "./contract-abis/merkle-distributor"
import balances from "../constants/balances"
import BalanceTree from "../lib/balance-tree"
import { createBackgroundAsyncThunk } from "./utils"
import { getContract } from "./utils/contract-utils"
import * as DAOs from "../static/DAOs.json"
import * as delegates from "../static/delegates.json"
import * as eligibles from "../static/eligibles.json"

const newBalanceTree = new BalanceTree(balances)

interface ClaimingState {
  status: string
  claimed: {
    [address: string]: boolean
  }
  distributor: any
  delegates: {
    address: string
    ensName: string
    applicationLink: string
  }[]
  eligibles: {
    address: string
    earnings: string
    reasons: string
  }[]
  DAOs: {
    address: string
    name: string
    logoAsset: string
  }[]
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
  delegates,
  DAOs,
  eligibles,
} as ClaimingState

const claimingSlice = createSlice({
  name: "claim",
  initialState,
  reducers: {},
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

export default claimingSlice.reducer
