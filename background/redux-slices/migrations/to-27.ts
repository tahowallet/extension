import { WalletData } from "../../services/keyring"

type OldState = {
  keyrings: {
    keyringMetadata: {
      [keyringId: string]: {
        source: "import" | "internal"
      }
    }
    [sliceKey: string]: unknown
  }
}

type NewState = {
  keyrings: {
    metadata: {
      [keyringId: string]: {
        source: "import" | "internal"
      }
    }
    wallets: WalletData[]
    [sliceKey: string]: unknown
  }
}

export default (prevState: Record<string, unknown>): NewState => {
  const oldState = prevState as OldState
  const {
    keyrings: { keyringMetadata, ...keyringsState },
  } = oldState

  return {
    ...prevState,
    keyrings: {
      ...keyringsState,
      metadata: keyringMetadata,
      wallets: [],
    },
  }
}
