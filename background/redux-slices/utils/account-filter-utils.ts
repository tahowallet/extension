export type AccountData = {
  address: string
  name: string
  avatarURL: string
}

export const getAdditionalDataForFilter = (
  address: string,
  accounts: AccountData[]
): { name?: string; thumbnailURL?: string } => {
  const result = accounts.find((account) => account.address === address)
  return result ? { name: result.name, thumbnailURL: result.avatarURL } : {}
}
