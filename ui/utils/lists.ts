export const intersperseWith = <T, K>(
  items: T[],
  getItem: (index: number) => K
): (T | K)[] => {
  const result: (T | K)[] = []

  for (let i = 0; i < items.length; i += 1) {
    const element = items[i]

    result.push(element)

    if (i < items.length - 1) {
      result.push(getItem(i))
    }
  }
  return result
}

export const excludeFalsyValues = <T>(items: (T | boolean)[]): T[] => {
  return items.filter((item): item is Exclude<T | boolean, boolean> => !!item)
}

export default {}
