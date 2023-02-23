type State = {
  abilities: {
    filter: { state: string; types: string[]; accounts: string[] }
    abilities: {
      [address: string]: {
        [uuid: string]: unknown
      }
    }
    hideDescription: boolean
  }
}

export default (
  prevState: Record<string, unknown>
): Record<string, unknown> => {
  const typedPrevState = prevState as State

  const { abilities } = typedPrevState

  if (!abilities) {
    return prevState
  }

  const { filter } = abilities

  const types = filter.types.includes("claim")
    ? filter.types
    : [...filter.types, "claim"]

  return {
    ...prevState,
    abilities: {
      ...abilities,
      filter: {
        ...filter,
        types,
      },
    },
  }
}
