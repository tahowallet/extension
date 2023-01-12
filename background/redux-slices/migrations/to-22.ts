// This migration ensures the assets collection is cleared due to a change in
// assets slice shape; the assets list should be repopulated during startup by
// the IndexingService.

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const { assets, ...newState } = prevState

  // Clear assets collection; these should be immediately repopulated by the
  // IndexingService in startService.
  newState.assets = []

  return newState
}
