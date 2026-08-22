type OldState = {
  networks: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  networks: {
    [sliceKey: string]: unknown
    unreachableNetworks: { [chainID: string]: boolean }
  }
  [otherSlice: string]: unknown
}

/**
 * Adds the networks slice's per-chain reachability map.
 *
 * Persisted state replaces a slice's initial state wholesale rather than
 * merging into it, so without this the key is simply absent for anyone
 * upgrading and every read of it — including one on a component that renders
 * on every screen — finds `undefined`.
 *
 * Establishing the key is all this does. Migrations are version-gated and run
 * once, so keeping the map from carrying an outage across a restart is the job
 * of the `networkReachabilityReset` dispatched at startup, not of this.
 */
export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    networks: {
      ...typedPrevState.networks,
      unreachableNetworks: {},
    },
  }
}
