


// sort of a future proofing for indexdb

export async function getPersistedState (key) {
  return window.localStorage[key] ? JSON.parse(window.localStorage[key]) : undefined
}


export async function persistState (key, newState) {
  window.localStorage[key] = JSON.stringify(newState)
}