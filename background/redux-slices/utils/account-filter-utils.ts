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

const getAdditionalDataForFilter = (
  id: string,
  accounts: AccountData[]
): { name?: string; thumbnailURL?: string } => {
  const result = accounts.find((account) => account.address === id)
  return result ? { name: result.name, thumbnailURL: result.avatarURL } : {}
}

export const getEnrichedAccountFilter = (
  filters: FilterAccount[],
  accountTotals: AccountData[]
): FilterAccount[] => {
  return filters.reduce<FilterAccount[]>((acc, filter) => {
    const additionalData = getAdditionalDataForFilter(filter.id, accountTotals)
    if (Object.keys(additionalData).length > 0) {
      return [
        ...acc,
        {
          ...filter,
          ...additionalData,
        },
      ]
    }
    return [...acc]
  }, [])
}
