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
 * It starts empty, which is also what it should be after any restart: the
 * verdict comes from a per-provider tracker that lives and dies with the
 * service worker, so a chain that was unreachable when the extension last shut
 * down deserves to be tried again rather than assumed broken.
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
