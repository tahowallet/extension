import { ETHEREUM, OPTIMISM, POLYGON } from "../../constants"
import type { RootState } from ".."
import reducer, {
  initialState,
  networkReachabilityChanged,
  NetworksState,
  setEVMNetworks,
} from "../networks"
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
})
