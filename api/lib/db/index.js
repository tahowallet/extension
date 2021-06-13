


// sort of a future proofing for indexdb

export async function getPersistedState (key) {
  return window.localStorage[key]
}


export async function persistState (key, newState) {
  window.localStorage[key] = newState
}