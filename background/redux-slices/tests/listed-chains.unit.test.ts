import { ARBITRUM_NOVA, DEFAULT_NETWORKS, ETHEREUM } from "../../constants"
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
import {
  getNetworkCountForOverview,
  selectAccountTotalsForOverview,
} from "../selectors"

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
    updateAccountBalance({
      balances: [
        createAccountBalance({
          address: ADDRESS,
          network: ETHEREUM,
          assetAmount: { asset: ETHEREUM.baseAsset, amount: 1n },
        }),
      ],
      addressOnNetwork: { address: ADDRESS, network: ETHEREUM },
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

describe("Portfolio overview", () => {
  /**
   * Returns state whose accounts data still holds the fork after the fork
   * has left the network list, as an install that removed it with an older
   * version can.
   */
  const stateWithLeftoverFork = (): RootState => {
    const state = stateWithFork()
    return {
      ...state,
      networks: {
        ...state.networks,
        evmNetworks: { [ETHEREUM.chainID]: ETHEREUM },
      },
    }
  }

  it("counts listed networks", () => {
    const state = stateWithFork()

    expect(
      Object.keys(selectAccountTotalsForOverview(state)[ADDRESS].totals),
    ).toEqual([ETHEREUM.chainID, FORK.chainID])
    expect(getNetworkCountForOverview(state)).toBe(2)
  })

  it("leaves out networks missing from the list", () => {
    const state = stateWithLeftoverFork()

    expect(
      Object.keys(selectAccountTotalsForOverview(state)[ADDRESS].totals),
    ).toEqual([ETHEREUM.chainID])
    expect(getNetworkCountForOverview(state)).toBe(1)
  })
})

describe("A complete network list", () => {
  const ORIGIN = "https://fork.example.com"

  /**
   * Returns state holding data for the fork in every slice that keys data by
   * chain, alongside mainnet's and that of a built-in network missing from
   * the list, as a feature-flagged network can be.
   */
  const stateWithForkEverywhere = (): RootState => {
    const state = reduce(
      undefined,
      setEVMNetworks([...DEFAULT_NETWORKS, FORK]),
      loadAccount({ address: ADDRESS, network: ETHEREUM }),
      loadAccount({ address: ADDRESS, network: FORK }),
      updateAccountBalance({
        balances: [
          forkBaseBalance(),
          createAccountBalance({
            address: ADDRESS,
            network: ETHEREUM,
            assetAmount: { asset: ETHEREUM.baseAsset, amount: 1n },
          }),
        ],
        addressOnNetwork: { address: ADDRESS, network: FORK },
      }),
    )
    const perChain = <T>(value: () => T) => ({
      [ETHEREUM.chainID]: value(),
      [ARBITRUM_NOVA.chainID]: value(),
      [FORK.chainID]: value(),
    })

    return {
      ...state,
      account: {
        ...state.account,
        accountsData: {
          evm: {
            ...state.account.accountsData.evm,
            [ARBITRUM_NOVA.chainID]: { [ADDRESS]: "loading" },
          },
        },
      },
      prices: {
        [`${ETHEREUM.chainID}/base`]: {},
        [`${FORK.chainID}/base`]: {},
      },
      nfts: { ...state.nfts, nfts: perChain(() => ({ [ADDRESS]: {} })) },
      dapp: {
        ...state.dapp,
        allowed: { evm: perChain(() => ({ [ADDRESS]: {} })) },
        currentNetworkByOrigin: {
          [ORIGIN]: FORK,
          "https://a.example": ETHEREUM,
        },
      },
      transactionConstruction: {
        ...state.transactionConstruction,
        estimatedFeesPerGas: perChain(() => ({})),
      },
      activities: { activities: { [ADDRESS]: perChain(() => []) } },
    }
  }

  /** Returns the chains each chain-keyed slice of the state holds. */
  const chainsHeld = (state: RootState) => ({
    accounts: Object.keys(state.account.accountsData.evm).sort(),
    assets: state.assets.ids.map((id) => String(id).split("/")[0]).sort(),
    prices: Object.keys(state.prices)
      .map((key) => key.split("/")[0])
      .sort(),
    nfts: Object.keys(state.nfts.nfts).sort(),
    permissions: Object.keys(state.dapp.allowed.evm).sort(),
    originNetworks: Object.values(state.dapp.currentNetworkByOrigin)
      .map(({ chainID }) => chainID)
      .sort(),
    fees: Object.keys(state.transactionConstruction.estimatedFeesPerGas).sort(),
    activities: Object.keys(state.activities.activities[ADDRESS]).sort(),
  })

  it("drops the data of chains it leaves out, except built-in ones", () => {
    const state = reduce(
      stateWithForkEverywhere(),
      setEVMNetworks(DEFAULT_NETWORKS),
    )

    const kept = [ARBITRUM_NOVA.chainID, ETHEREUM.chainID].sort()
    expect(chainsHeld(state)).toEqual({
      accounts: kept,
      assets: [ETHEREUM.chainID],
      prices: [ETHEREUM.chainID],
      nfts: kept,
      permissions: kept,
      originNetworks: [ETHEREUM.chainID],
      fees: kept,
      activities: kept,
    })
  })

  it("keeps the data of chains it includes", () => {
    const state = stateWithForkEverywhere()

    expect(
      chainsHeld(reduce(state, setEVMNetworks([...DEFAULT_NETWORKS, FORK]))),
    ).toEqual(chainsHeld(state))
  })

  it("is the only kind of list that drops anything", () => {
    // A list without the built-in networks can only be partial, and pruning
    // by it would erase data for networks that still exist.
    const state = stateWithForkEverywhere()

    expect(chainsHeld(reduce(state, setEVMNetworks([ETHEREUM])))).toEqual(
      chainsHeld(state),
    )
  })
})
