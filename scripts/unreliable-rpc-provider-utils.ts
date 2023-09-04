export const patchRPCURL = (url: string): string =>
  `http://localhost:9000?rpc=${url}`

export const patchRPCURLS = (
  chainIDToRPCMap: Record<string, string[]>,
): typeof chainIDToRPCMap =>
  Object.fromEntries(
    Object.entries(chainIDToRPCMap).map(([_, urls]) => [
      _,
      urls.map(patchRPCURL),
    ]),
  )
