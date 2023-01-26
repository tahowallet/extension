export type FilterAccount = {
  id: string
  isEnabled: boolean
  name: string
  thumbnailURL?: string
}

export type AccountData = {
  address: string
  name: string
  avatarURL: string
}

export const getAdditionalDataForFilter = (
  id: string,
  accounts: AccountData[]
): { name?: string; thumbnailURL?: string } => {
  const result = accounts.find((account) => account.address === id)
  return result ? { name: result.name, thumbnailURL: result.avatarURL } : {}
}
