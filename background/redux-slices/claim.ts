import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, Signature, utils } from "ethers"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { Eligible } from "../services/doggo/types"

import { createBackgroundAsyncThunk } from "./utils"
import { normalizeEVMAddress, truncateAddress } from "../lib/utils"

import {
  getContract,
  getCurrentTimestamp,
  getProvider,
} from "./utils/contract-utils"
import DAOs from "../static/DAOs.json"
import delegates from "../static/delegates.json"
import { HexString } from "../types"
import DISTRIBUTOR_ABI from "./contract-abis/merkle-distributor"

import { DOGGO, HOUR } from "../constants"
import { HIDE_TOKEN_FEATURES, USE_MAINNET_FORK } from "../features"
import { ERC2612_INTERFACE } from "../lib/erc20"
import { ReferrerStats } from "../services/doggo/db"
import { fromFixedPointNumber } from "../lib/fixed-point"

export interface DAO {
  address: string
  name?: string
  avatar?: string
}

export interface Delegate {
  address?: string
  ensName?: string
  applicationLink?: string
  avatar?: string
  truncatedAddress?: string
  enteredBy?: "list" | "custom"
}

export interface Referrer {
  address: HexString
  ensName?: string
}

interface ClaimingState {
  status: string
  claimed: {
    [address: HexString]: boolean
  }
  delegates: Delegate[]
  eligibility: Eligible | null
  eligibilityLoading: boolean
  DAOs: DAO[]
  selectedForBonus: DAO | null
  selectedDelegate: Delegate | null
  signature: Signature | undefined
  nonce?: number
  expiry: number | undefined
  claimStep: number
  currentlyClaiming: boolean
  claimError: { [address: HexString]: boolean }
  referrer: Referrer | null
  referrerStats: ReferrerStats
}

const DOGGO_TOKEN_ADDRESS = DOGGO.contractAddress
export const VOTE_WITH_FRIENDS_ADDRESS =
  "0x0036B3a9D385Ce2CC072cf4A26dE29aE3283DEd0"

const getDistributorContract = async () => {
  const distributorContractAddress = VOTE_WITH_FRIENDS_ADDRESS // VoteWithFriends contract address
  const distributor = await getContract(
    distributorContractAddress,
    DISTRIBUTOR_ABI
  )
  return distributor
}

const initialState: ClaimingState = {
  status: "idle",
  claimed: {},
  selectedForBonus: null,
  selectedDelegate: null,
  eligibility: null,
  eligibilityLoading: false,
  delegates: delegates
    .sort(() => Math.random() - 0.5)
    .map((delegate) => {
      return {
        ...delegate,
        truncatedAddress: truncateAddress(delegate.address),
      }
    }),
  DAOs: DAOs.sort(() => Math.random() - 0.5),
  claimStep: 1,
  signature: undefined,
  nonce: undefined,
  expiry: undefined,
  currentlyClaiming: false,
  claimError: {},
  referrer: null,
  referrerStats: {
    bonusTotal: 0n,
    referredUsers: 0,
  },
} as ClaimingState

const claimingSlice = createSlice({
  name: "claim",
  initialState,
  reducers: {
    chooseSelectedForBonus: (immerState, { payload: DAO }) => {
      immerState.selectedForBonus = DAO
    },
    chooseDelegate: (immerState, { payload: delegate }) => {
      immerState.selectedDelegate = delegate
    },
    setEligibility: (immerState, { payload: eligibility }) => {
      immerState.eligibilityLoading = false
      immerState.eligibility = eligibility
    },
    setEligibilityLoading: (immerState) => {
      immerState.eligibilityLoading = true
    },
    setClaimStep: (immerState, { payload }: { payload: number }) => {
      immerState.claimStep = payload
    },
    resetStep: (immerState) => {
      immerState.claimStep = 1
    },
    claimError: (immerState, { payload }: { payload: HexString }) => {
      immerState.claimError[payload] = true
    },
    currentlyClaiming: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyClaiming = payload
    },
    claimed: (
      immerState,
      { payload }: { payload: { account: HexString; alreadyClaimed: boolean } }
    ) => {
      immerState.claimed[payload.account] = payload.alreadyClaimed
      immerState.claimError[payload.account] = false
    },
    saveSignature: (
      state,
      {
        payload: { signature, nonce, expiry },
      }: { payload: { signature: Signature; nonce: number; expiry: number } }
    ) => ({
      ...state,
      signature,
      nonce,
      expiry,
    }),
    resetClaimFlow: (immerState) => {
      immerState.signature = undefined
      immerState.selectedForBonus = null
      immerState.selectedDelegate = null
      immerState.claimStep = 1
      immerState.nonce = undefined
      immerState.expiry = undefined
      immerState.referrer = null
      immerState.currentlyClaiming = false
    },
    setReferrer: (
      immerState,
      { payload: referrer }: { payload: Referrer | null }
    ) => {
      immerState.referrer = referrer
    },
    resetReferrer: (immerState) => {
      immerState.referrer = null
    },
    setReferrerStats: (
      immerState,
      { payload: reffererStats }: { payload: ReferrerStats }
    ) => {
      immerState.referrerStats = reffererStats
    },
  },
})

export const {
  chooseSelectedForBonus,
  chooseDelegate,
  setEligibility,
  setEligibilityLoading,
  saveSignature,
  currentlyClaiming,
  setClaimStep,
  claimed,
  resetStep,
  resetClaimFlow,
  claimError,
  setReferrer,
  resetReferrer,
  setReferrerStats,
} = claimingSlice.actions

export default claimingSlice.reducer

export const checkAlreadyClaimed = createBackgroundAsyncThunk(
  "claim/checkAlreadyClaimed",
  async ({ claimState }: { claimState: ClaimingState }, { dispatch }) => {
    if (HIDE_TOKEN_FEATURES) {
      return false
    }
    const { eligibility } = claimState
    const distributorContract = await getDistributorContract()
    if (!eligibility) {
      return false
    }
    const alreadyClaimed = await distributorContract.isClaimed(
      eligibility.index
    )
    if (alreadyClaimed) {
      dispatch(claimed({ account: eligibility.account, alreadyClaimed }))
    }
    return alreadyClaimed
  }
)

export const claimRewards = createBackgroundAsyncThunk(
  "claim/distributorClaim",
  async (claimState: ClaimingState, { dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = await signer.getAddress()

    const referralAddress =
      claimState.referrer?.address ?? claimState.selectedForBonus?.address

    const delegate = claimState.selectedDelegate
    const { signature, eligibility } = claimState

    if (!eligibility) {
      return
    }
    const distributorContract = await getDistributorContract()

    dispatch(currentlyClaiming(true))

    const confirmReceipt = async (response: Promise<TransactionResponse>) => {
      const result = await response
      const receipt = await result.wait()
      if (receipt.status === 1) {
        dispatch(currentlyClaiming(false))
        dispatch(
          claimed({
            account: normalizeEVMAddress(account),
            alreadyClaimed: true,
          })
        )
        dispatch(resetClaimFlow())
        return
      }
      dispatch(currentlyClaiming(false))
      dispatch(dispatch(claimError(normalizeEVMAddress(account))))
      throw new Error("Could not claim")
    }

    let claimTransaction
    if (claimState.selectedForBonus === null && delegate === null) {
      claimTransaction = await distributorContract.populateTransaction.claim(
        eligibility.index,
        account,
        eligibility.amount,
        eligibility.proof
      )
    }

    if (typeof referralAddress !== "undefined" && delegate === null) {
      claimTransaction =
        await distributorContract.populateTransaction.claimWithCommunityCode(
          eligibility.index,
          account,
          eligibility.amount,
          eligibility.proof,
          referralAddress
        )
    }
    if (
      signature &&
      typeof referralAddress !== "undefined" &&
      delegate !== null
    ) {
      const { r, s, v } = signature
      const { nonce, expiry } = claimState
      claimTransaction =
        await distributorContract.populateTransaction.voteWithFriends(
          BigNumber.from(eligibility.index),
          account,
          BigNumber.from(eligibility.amount),
          eligibility.proof,
          referralAddress,
          delegate.address,
          { nonce, expiry, r, s, v }
        )
    }
    if (claimTransaction) {
      if (USE_MAINNET_FORK) {
        claimTransaction.gasLimit = BigNumber.from(350000) // for mainnet fork only
      }
      try {
        const response = signer.sendTransaction(claimTransaction)
        await confirmReceipt(response)
      } catch {
        dispatch(currentlyClaiming(false))
        dispatch(dispatch(claimError(normalizeEVMAddress(account))))
      }
    }
  }
)

export const signTokenDelegationData = createBackgroundAsyncThunk(
  "claim/signDelegation",
  async (_, { getState, dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const address = await signer.getAddress()

    const state = getState()
    const { claim } = state as { claim: ClaimingState }

    const delegatee = claim.selectedDelegate?.address

    if (delegatee) {
      const TallyTokenContract = await getContract(
        DOGGO_TOKEN_ADDRESS,
        ERC2612_INTERFACE
      )

      const nonce: BigNumber = await TallyTokenContract.nonces(address)
      const nonceValue = Number(nonce)

      const timestamp = await getCurrentTimestamp()

      const expiry = timestamp + 12 * (HOUR / 1000)
      const types = {
        Delegation: [
          { name: "delegatee", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
        ],
      }
      const domain = {
        name: "Doggo Token",
        chainId: 1,
      }
      const message = {
        delegatee,
        nonce: nonceValue,
        expiry,
      }
      // _signTypedData is the ethers function name, once the official release will be ready _ will be dropped
      // eslint-disable-next-line no-underscore-dangle
      const tx = await signer._signTypedData(domain, types, message)

      const signature = utils.splitSignature(tx)

      dispatch(
        claimingSlice.actions.saveSignature({
          signature,
          nonce: nonceValue,
          expiry,
        })
      )
    }
  }
)

export const selectClaim = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState
)

export const selectIsDelegationSigned = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => typeof claimState.signature !== "undefined"
)

export const selectClaimed = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.claimed
)

export const selectClaimError = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.claimError
)

export const selectCurrentlyClaiming = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.currentlyClaiming
)

export const selectClaimSelections = createSelector(
  selectClaim,
  (claimState: ClaimingState) => {
    return {
      selectedDelegate: {
        ...claimState.selectedDelegate,
        truncatedAddress: claimState?.selectedDelegate?.address
          ? truncateAddress(claimState?.selectedDelegate?.address)
          : undefined,
      },
      selectedForBonus: claimState.selectedForBonus,
    }
  }
)

export const selectReferrerStats = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.referrerStats
)

export const selectEligibility = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) =>
    fromFixedPointNumber(
      {
        amount: BigInt(Number(claimState.eligibility?.amount || 0n)) || 0n,
        decimals: DOGGO.decimals,
      },
      0
    )
)

export const selectEligibilityLoading = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.eligibilityLoading
)
