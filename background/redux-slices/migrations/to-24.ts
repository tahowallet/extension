export default (prevState: Record<string, any>): Record<string, unknown> => {
  const { networks, ...newState } = prevState

  newState.networks = { blockInfo: networks.evm, evmNetworks: {} }

  return newState
}
