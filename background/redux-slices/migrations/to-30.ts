type OldState = {
  nfts: unknown
  nftsUpdate: unknown
  [otherSlice: string]: unknown
}

type NewState = {
  nfts: unknown
  [otherSlice: string]: unknown
}

// Remove old nfts slice and rename updated nfts slice
export default (prevState: Record<string, unknown>): NewState => {
  const { nfts, nftsUpdate, ...otherState } = prevState as OldState

  return {
    ...otherState,
    nfts: nftsUpdate,
  }
}
