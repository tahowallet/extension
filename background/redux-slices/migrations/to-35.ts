export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const { assets: _, ...newState } = prevState

  // Clear assets collection; these should be immediately repopulated by the
  // IndexingService in startService.
  // We are changing assets slice from array to object to improve performance.
  newState.assets = {}

  return newState
}
