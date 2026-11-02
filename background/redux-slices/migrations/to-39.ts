type OldState = {
  account: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  account: {
    [sliceKey: string]: unknown
    controlCompatibility: { [address: string]: { [chainID: string]: string[] } }
  }
  [otherSlice: string]: unknown
}

/**
 * Adds the accounts slice's control compatibility map, which the signing
 * service fills in shortly after startup. See RFB 5.
 *
 * Persisted state replaces a slice's initial state wholesale rather than
 * merging into it, so without this the key would be absent for anyone upgrading
 * and every read of it would find `undefined`.
 */
export default (prevState: Record<string, unknown>): NewState => {
  const typedPrevState = prevState as OldState

  return {
    ...prevState,
    account: {
      ...typedPrevState.account,
      controlCompatibility: {},
    },
  }
}
