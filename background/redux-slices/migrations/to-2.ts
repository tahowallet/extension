// This migration moves from the old currentAccount SelectedAccount type to a
// bare selectedAccount AddressNetwork type. Note the avoidance of imported
// types so this migration will work in the future, regardless of other code
// changes

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

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const newState = { ...prevState }
  const addressNetwork = (prevState as OldState)?.ui?.currentAccount
    ?.addressNetwork
  delete (newState as OldState)?.ui?.currentAccount
  newState.selectedAccount = addressNetwork as BroadAddressNetwork
  return newState
}
