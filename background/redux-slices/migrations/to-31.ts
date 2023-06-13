type OldState = {
  keyrings: {
    keyringMetadata: {
      [keyringId: string]: {
        source: "import" | "internal"
      }
    }
    importing: false | "pending" | "done" | "failed"
    [sliceKey: string]: unknown
  }
}

type NewState = {
  internalSigner: {
    metadata: {
      [keyringId: string]: {
        source: "import" | "internal"
      }
    }
    privateKeys: { type: "single#secp256k1"; path: null; addresses: [string] }[]
    [sliceKey: string]: unknown
  }
}

export default (prevState: Record<string, unknown>): NewState => {
  const oldState = prevState as OldState
  const {
    keyrings: { keyringMetadata, importing, ...keyringsState },
    ...stateWithoutKeyrings
  } = oldState

  return {
    ...stateWithoutKeyrings,
    internalSigner: {
      ...keyringsState,
      metadata: keyringMetadata,
      privateKeys: [],
    },
  }
}
