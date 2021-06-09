


// sort of a future proofing for indexdb

export async function getPersistedState (key) {
  return localstorage[key]
}