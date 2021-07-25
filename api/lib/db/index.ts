declare global {
  interface Window {
    localStorage: any
  }
}

// sort of a future proofing for indexdb

export async function getPersistedState (key) {
  if (window.localStorage[key]) {
    try {
      return JSON.parse(window.localStorage[key])
    } catch (_) {/*do nothing for parse errors*/}
  }
}


export async function persistState (key, newState) {
  window.localStorage[key] = JSON.stringify(newState)
}
