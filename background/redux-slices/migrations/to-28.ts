import { PrivateKey } from "../../services/internal-signer"

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
    privateKeys: PrivateKey[]
    [sliceKey: string]: unknown
  }
}

export default (prevState: Record<string, unknown>): NewState => {
  const oldState = prevState as OldState
  const {
    keyrings: { keyringMetadata, importing, ...keyringsState },
  } = oldState

  return {
    ...prevState,
    internalSigner: {
      ...keyringsState,
      metadata: keyringMetadata,
      privateKeys: [],
    },
  }
}
