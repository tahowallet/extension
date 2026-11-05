import { ETHEREUM } from "../../constants"
import type { EVMNetwork } from "../../networks"
import {
  createAccountBalance,
  createAnyEVMBlock,
  createNetworkBaseAsset,
} from "../../tests/factories"
import rootReducer, { RootState } from ".."
import {
  loadAccount,
  removeChainBalances,
  updateAccountBalance,
} from "../accounts"
import {
  blockSeen,
  networkReachabilityChanged,
  setEVMNetworks,
} from "../networks"

const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

/** A custom network like the Tenderly mainnet forks users add and remove. */
const FORK: EVMNetwork = {
  name: "Tenderly Mainnet Fork",
  chainID: "73571",
  family: "EVM",
  baseAsset: {
    ...createNetworkBaseAsset({ chainID: "73571", symbol: "ETH" }),
    name: "Ether",
    metadata: { tokenLists: [], coinGeckoID: "ethereum" },
  },
}

const forkBaseBalance = () =>
  createAccountBalance({
    address: ADDRESS,
    network: FORK,
    assetAmount: { asset: FORK.baseAsset, amount: 10n * 10n ** 18n },
  })

const reduce = (state: RootState | undefined, ...actions: { type: string }[]) =>
  actions.reduce<RootState>(
    (current, action) => rootReducer(current, action),
    rootReducer(state, { type: "test/init" }),
  )

/**
 * Returns state with an account loaded with a base balance on both mainnet
 * and the fork.
 */
const stateWithFork = (): RootState =>
  reduce(
    undefined,
    setEVMNetworks([ETHEREUM, FORK]),
    loadAccount({ address: ADDRESS, network: ETHEREUM }),
    loadAccount({ address: ADDRESS, network: FORK }),
    updateAccountBalance({
      balances: [forkBaseBalance()],
      addressOnNetwork: { address: ADDRESS, network: FORK },
    }),
  )

/** Returns the given state after removing the fork the way the UI does. */
const removeFork = (state: RootState): RootState =>
  reduce(state, removeChainBalances(FORK.chainID), setEVMNetworks([ETHEREUM]))

describe("Writes for chains missing from the network list", () => {
  it("are applied while the chain is listed", () => {
    expect(stateWithFork().account.accountsData.evm[FORK.chainID]).toEqual({
      [ADDRESS]: expect.objectContaining({ address: ADDRESS }),
    })
  })

  it("do not bring a removed network's balances back", () => {
    // Removal, then the writes that can land after it: a popup still showing
    // the fork as selected re-tracks the account, which has the next startup
    // load it, and a balance load that was in flight finishes.
    const state = reduce(
      removeFork(stateWithFork()),
      loadAccount({ address: ADDRESS, network: FORK }),
      updateAccountBalance({
        balances: [forkBaseBalance()],
        addressOnNetwork: { address: ADDRESS, network: FORK },
      }),
    )

    expect(state.account.accountsData.evm).not.toHaveProperty(FORK.chainID)
    expect(state.account.accountsData.evm).toHaveProperty(ETHEREUM.chainID)
  })

  it("keep the listed balances of a mixed update", () => {
    const state = reduce(
      removeFork(stateWithFork()),
      updateAccountBalance({
        balances: [
          forkBaseBalance(),
          createAccountBalance({
            address: ADDRESS,
            network: ETHEREUM,
            assetAmount: { asset: ETHEREUM.baseAsset, amount: 1n },
          }),
        ],
        addressOnNetwork: { address: ADDRESS, network: ETHEREUM },
      }),
    )

    expect(state.account.accountsData.evm).not.toHaveProperty(FORK.chainID)
    expect(
      state.account.accountsData.evm[ETHEREUM.chainID][ADDRESS],
    ).toMatchObject({ address: ADDRESS })
  })

  it("do not bring a removed network's block or reachability back", () => {
    const state = reduce(
      removeFork(stateWithFork()),
      blockSeen(createAnyEVMBlock({ network: FORK })),
      networkReachabilityChanged({
        chainID: FORK.chainID,
        status: "unreachable",
      }),
    )

    expect(state.networks.blockInfo).not.toHaveProperty(FORK.chainID)
    expect(state.networks.unreachableNetworks).not.toHaveProperty(FORK.chainID)
  })

  it("are applied before the network list first arrives", () => {
    // On a fresh install nothing is listed yet, and nothing can be judged
    // unlisted.
    const state = reduce(
      undefined,
      loadAccount({ address: ADDRESS, network: FORK }),
    )

    expect(state.account.accountsData.evm[FORK.chainID]).toEqual({
      [ADDRESS]: "loading",
    })
  })
})
