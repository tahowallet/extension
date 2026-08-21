import { ETHEREUM, OPTIMISM, POLYGON } from "../../constants"
import type { RootState } from ".."
import reducer, {
  initialState,
  networkReachabilityChanged,
  NetworksState,
  setEVMNetworks,
} from "../networks"
import to37 from "../migrations/to-37"
import {
  selectIsCurrentNetworkUnreachable,
  selectUnreachableNetworks,
} from "../selectors/networks"

const stateWith = (
  unreachableNetworks: NetworksState["unreachableNetworks"],
): NetworksState => ({ ...initialState, unreachableNetworks })

/**
 * Just enough of the root state for the network selectors, which only read the
 * networks slice and the selected account's network.
 */
const rootStateWith = (
  networks: NetworksState,
  currentNetwork = ETHEREUM,
): RootState =>
  ({
    networks,
    ui: { selectedAccount: { address: "0x0", network: currentNetwork } },
  }) as unknown as RootState

describe("Networks redux slice", () => {
  describe("networkReachabilityChanged", () => {
    it("records an unreachable chain", () => {
      const state = reducer(
        initialState,
        networkReachabilityChanged({
          chainID: OPTIMISM.chainID,
          status: "unreachable",
        }),
      )

      expect(state.unreachableNetworks).toEqual({ [OPTIMISM.chainID]: true })
    })

    it("drops a chain that has recovered", () => {
      const state = reducer(
        stateWith({ [OPTIMISM.chainID]: true }),
        networkReachabilityChanged({
          chainID: OPTIMISM.chainID,
          status: "reachable",
        }),
      )

      expect(state.unreachableNetworks).toEqual({})
    })

    it("leaves other chains alone", () => {
      const state = reducer(
        stateWith({ [POLYGON.chainID]: true }),
        networkReachabilityChanged({
          chainID: OPTIMISM.chainID,
          status: "unreachable",
        }),
      )

      expect(state.unreachableNetworks).toEqual({
        [POLYGON.chainID]: true,
        [OPTIMISM.chainID]: true,
      })
    })
  })

  describe("setEVMNetworks", () => {
    it("forgets the reachability of a network that is no longer supported", () => {
      // A network the user has removed should not leave a warning behind for a
      // chain that is no longer in the list at all.
      const withBothNetworks = reducer(
        stateWith({ [OPTIMISM.chainID]: true }),
        setEVMNetworks([ETHEREUM, OPTIMISM]),
      )

      const state = reducer(withBothNetworks, setEVMNetworks([ETHEREUM]))

      expect(state.unreachableNetworks).toEqual({})
    })

    it("keeps the reachability of a network that is still supported", () => {
      const withBothNetworks = reducer(
        stateWith({ [OPTIMISM.chainID]: true }),
        setEVMNetworks([ETHEREUM, OPTIMISM]),
      )

      const state = reducer(
        withBothNetworks,
        setEVMNetworks([ETHEREUM, OPTIMISM]),
      )

      expect(state.unreachableNetworks).toEqual({ [OPTIMISM.chainID]: true })
    })
  })

  describe("selectors", () => {
    it("hands out the whole map, so a list can read it once", () => {
      const networks = stateWith({ [OPTIMISM.chainID]: true })

      expect(selectUnreachableNetworks(rootStateWith(networks))).toEqual({
        [OPTIMISM.chainID]: true,
      })
    })

    it("follows the selected network rather than a background one", () => {
      const networks = stateWith({ [OPTIMISM.chainID]: true })

      // Polling covers every subscribed chain, so a chain the user is not
      // looking at can be down while the one they are looking at is fine.
      expect(
        selectIsCurrentNetworkUnreachable(rootStateWith(networks, ETHEREUM)),
      ).toBe(false)
      expect(
        selectIsCurrentNetworkUnreachable(rootStateWith(networks, OPTIMISM)),
      ).toBe(true)
    })
  })

  describe("migration to 37", () => {
    it("gives the reachability map to state that predates it", () => {
      // Persisted state replaces a slice's initial state rather than merging
      // into it, so a missing key stays missing and every read of it finds
      // undefined — including one on a component that renders on every screen.
      const migrated = to37({
        networks: { evmNetworks: {}, blockInfo: {} },
        ui: {},
      })

      expect(migrated.networks.unreachableNetworks).toEqual({})
    })

    it("does not carry an outage across a restart", () => {
      // The verdict comes from a tracker that dies with the service worker and
      // only reports transitions, so a restored `unreachable` would never be
      // contradicted.
      const migrated = to37({
        networks: {
          evmNetworks: {},
          blockInfo: {},
          unreachableNetworks: { [OPTIMISM.chainID]: true },
        },
      })

      expect(migrated.networks.unreachableNetworks).toEqual({})
    })

    it("leaves the rest of the slice alone", () => {
      const migrated = to37({
        networks: { evmNetworks: { "1": ETHEREUM }, blockInfo: { "1": {} } },
        account: { accountsData: { evm: {} } },
      })

      expect(migrated.networks.evmNetworks).toEqual({ "1": ETHEREUM })
      expect(migrated.networks.blockInfo).toEqual({ "1": {} })
      expect(migrated.account).toEqual({ accountsData: { evm: {} } })
    })
  })
})
