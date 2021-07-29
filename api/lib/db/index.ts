// sort of a future proofing for indexdb

export function getPersistedState(key) {
  if (window.localStorage[key]) {
    try {
      return JSON.parse(window.localStorage[key])
    } catch (_) {
      /* do nothing for parse errors */
    }
  }

  return undefined
}

export async function persistState(key, newState) {
  window.localStorage[key] = JSON.stringify(newState)
}
