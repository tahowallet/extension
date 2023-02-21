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
  const { filter } = abilities

  return {
    ...prevState,
    abilities: {
      ...abilities,
      filter: {
        ...filter,
        types: [...filter.types, "claim"],
      },
    },
  }
}