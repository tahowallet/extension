// The version of persisted Redux state the extension is expecting. Any previous
// state without this version, or with a lower version, ought to be migrated.
export const REDUX_STATE_VERSION = 5

type Migration = (prevState: Record<string, unknown>) => Record<string, unknown>

// An object mapping a version number to a state migration. Each migration for
// version n is expected to take a state consistent with version n-1, and return
// state consistent with version n.
const REDUX_MIGRATIONS: { [version: number]: Migration } = {
  2: (prevState: Record<string, unknown>) => {
    // Migrate the old currentAccount SelectedAccount type to a bare
    // selectedAccount AddressNetwork type. Note the avoidance of imported types
    // so this migration will work in the future, regardless of other code changes
    type BroadAddressNetwork = {
      address: string
      network: Record<string, unknown>
    }
    type OldState = {
      ui: {
        currentAccount?: {
          addressNetwork: BroadAddressNetwork
          truncatedAddress: string
        }
      }
    }
    const newState = { ...prevState }
    const addressNetwork = (prevState as OldState)?.ui?.currentAccount
      ?.addressNetwork
    delete (newState as OldState)?.ui?.currentAccount
    newState.selectedAccount = addressNetwork as BroadAddressNetwork
    return newState
  },
  3: (prevState: Record<string, unknown>) => {
    const { assets, ...newState } = prevState

    // Clear assets collection; these should be immediately repopulated by the
    // IndexingService in startService.
    newState.assets = []

    return newState
  },
  4: (prevState: Record<string, unknown>) => {
    // Migrate the ETH-only block data in store.accounts.blocks[blockHeight] to
    // a new networks slice. Block data is now network-specific, keyed by EVM
    // chainID in store.networks.networkData[chainId].blocks
    type OldState = {
      account?: {
        blocks?: { [blockHeight: number]: unknown }
      }
    }
    type NetworkState = {
      evm: {
        [chainID: string]: {
          blockHeight: number | null
          blocks: {
            [blockHeight: number]: unknown
          }
        }
      }
    }

    const oldState = prevState as OldState

    const networks: NetworkState = {
      evm: {
        "1": {
          blocks: { ...oldState.account?.blocks },
          blockHeight:
            Math.max(
              ...Object.keys(oldState.account?.blocks ?? {}).map((s) =>
                parseInt(s, 10)
              )
            ) || null,
        },
      },
    }

    const { blocks, ...oldStateAccountWithoutBlocks } = oldState.account ?? {
      blocks: undefined,
    }

    return {
      ...prevState,
      // Drop blocks from account slice.
      account: oldStateAccountWithoutBlocks,
      // Add new networks slice data.
      networks,
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  5: (prevState: any) => {
    const { ...newState } = prevState
    newState.keyrings.keyringMetadata = {}

    return newState
  },
}

// Migrate a previous version of the Redux state to that expected by the current
// code base.
export function migrateReduxState(
  previousState: Record<string, unknown>,
  previousVersion?: number
): Record<string, unknown> {
  const resolvedVersion = previousVersion ?? 1
  let migratedState: Record<string, unknown> = previousState

  if (resolvedVersion < REDUX_STATE_VERSION) {
    const outstandingMigrations = Object.entries(REDUX_MIGRATIONS)
      .sort()
      .filter(([version]) => parseInt(version, 10) > resolvedVersion)
      .map(([, migration]) => migration)
    migratedState = outstandingMigrations.reduce(
      (state: Record<string, unknown>, migration: Migration) => {
        return migration(state)
      },
      migratedState
    )
  }

  return migratedState
}
