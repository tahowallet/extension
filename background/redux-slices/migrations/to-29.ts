// This migration ensures the assets collection is cleared of duplicated
// base assets

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const { assets, ...newState } = prevState

  // Clear assets collection; these should be immediately repopulated by the
  // IndexingService in startService.
  newState.assets = []

  return newState
}
