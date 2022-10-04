export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const { activities, ...newState } = prevState

  // Clear activities slice as we now have new activities slice instead
  newState.activities = {}

  return newState
}
