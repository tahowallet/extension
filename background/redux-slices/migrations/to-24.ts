type OldState = {
  networks: {
    evm: unknown
  }
}

type NewState = {
  networks: {
    blockInfo: unknown
    evmNetworks: Record<string, unknown>
  }
}

export default (
  prevState: Record<string, unknown>,
): Record<string, unknown> => {
  const { networks, ...newState } = prevState as OldState

  ;(newState as NewState).networks = {
    blockInfo: networks.evm,
    evmNetworks: {},
  }

  return newState as NewState
}
