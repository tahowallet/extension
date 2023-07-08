// This migration ensures the assets collection is cleared of duplicated
// base assets https://github.com/tahowallet/extension/issues/3445

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const { assets: _, ...newState } = prevState

  // Clear assets collection; these should be immediately repopulated by the
  // IndexingService in startService.
  newState.assets = []

  return newState
}
