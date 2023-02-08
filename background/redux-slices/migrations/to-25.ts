import { AbilitiesState } from "../abilities"

type State = {
  abilities: AbilitiesState
}

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const newState = prevState as State
  // Accounts for filter should be enabled after the first initialization.
  // The state of the filters after each reload should not refresh.
  // That's why we need to catch whether abilities are set for the first time.
  newState.abilities.isInitiated = true

  return newState
}
