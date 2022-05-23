// This migration transitions the ETH-only block data in
// store.accounts.blocks[blockHeight] to a new networks slice. Block data is
// now network-specific, keyed by EVM chainID in
// store.networks.networkData[chainId].blocks

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

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
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
}
