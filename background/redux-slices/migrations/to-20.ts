type OldState = {
  account: {
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

type NewState = {
  account: {
    settingsBySigner: Array<{
      signer: unknown
      title?: string
    }>
    [sliceKey: string]: unknown
  }
  [otherSlice: string]: unknown
}

export default (oldState: Record<string, unknown>): NewState => {
  const prevState = oldState as OldState

  const { account } = prevState

  return { ...prevState, account: { ...account, settingsBySigner: [] } }
}
