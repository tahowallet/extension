import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"
import { Eligible } from "../services/claim/types"

import { createBackgroundAsyncThunk } from "./utils"
import { truncateAddress } from "../lib/utils"

import { getContract } from "./utils/contract-utils"
import DAOs from "../static/DAOs.json"
import delegates from "../static/delegates.json"
import { HexString } from "../types"
import DISTRIBUTOR_ABI from "./contract-abis/merkle-distributor"

import BalanceTree from "../lib/balance-tree"
import eligibles from "../static/eligibles.json"

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
    [address: HexString]: boolean
  }
  distributor: HexString
  delegates: Delegate[]
  eligibility: Eligible | null
  DAOs: DAO[]
  selectedDAO: DAO | null
  selectedDelegate: Delegate | null
}

const newBalanceTree = new BalanceTree(eligibles)

const findIndexAndBalance = (address: string) => {
  const index = eligibles.findIndex((el) => address === el.address)
  const balance = eligibles[index].earnings
  return { index, balance }
}

const getDistributorContract = async () => {
  const distributorContractAddress = "0x123" // Change distributor address here
  const distributor = await getContract(
    distributorContractAddress,
    DISTRIBUTOR_ABI
  )
  return distributor
}

const getProof = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber
) => {
  return newBalanceTree.getProof(index, account, amount)
}

const verifyProof = (
  index: number,
  account: HexString,
  balance: HexString,
  merkleProof: Buffer[]
) => {
  const root = newBalanceTree.getRoot()
  const exists = BalanceTree.verifyProof(
    index,
    account,
    BigNumber.from(balance),
    merkleProof,
    root
  )
  return exists
}

export const claimRewards = createBackgroundAsyncThunk(
  "claim/distributorClaim",
  async (
    {
      account,
      referralCode,
      delegate,
    }: {
      account: string
      referralCode?: string
      delegate?: HexString
    },
    { getState }
  ): Promise<string> => {
    const state = getState()
    const { claim } = state as { claim: ClaimingState }

    if (claim.claimed[account]) {
      throw new Error("already claimed")
    }

    const { index, balance } = await findIndexAndBalance(account)

    const merkleProof = getProof(index, account, BigNumber.from(balance))

    // the below line is used to verify if a merkleProof is in the merkle tree
    // const validMerkleProof = verifyProof(index, account, balance, merkleProof)

    const distributorContract = await getDistributorContract()

    try {
      if (!referralCode && !delegate) {
        const tx = await distributorContract.claim(
          index,
          account,
          balance,
          merkleProof
        )
        const receipt = await tx.wait()
        return receipt
      }

      // TODO Where do we get the { nonce, expiry, r, s, v }, do we sig TypedData?
      const tx = await distributorContract.voteWithFriends(
        index,
        account,
        balance,
        merkleProof,
        referralCode,
        delegate
        // { nonce, expiry, r, s, v }
      )
      await tx.wait()
      return account
    } catch {
      return Promise.reject()
    }
  }
)

const initialState = {
  status: "idle",
  claimed: {},
  distributor: {},
  selectedDAO: null,
  selectedDelegate: null,
  eligibility: null,
  delegates,
  DAOs,
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
    setEligibility: (immerState, { payload: eligibility }) => {
      immerState.eligibility = eligibility
    },
  },
  extraReducers: (builder) => {
    builder.addCase(claimRewards.pending, (immerState) => {
      immerState.status = "loading"
    })
    builder.addCase(
      claimRewards.fulfilled,
      (immerState, { payload }: { payload: string }) => {
        immerState.status = "success"
        immerState.claimed[payload] = true
      }
    )
    builder.addCase(claimRewards.rejected, (immerState) => {
      immerState.status = "rejected"
    })
  },
})

export const { chooseDAO, chooseDelegate, setEligibility } =
  claimingSlice.actions

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
