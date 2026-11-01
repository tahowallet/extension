import browser from "webextension-polyfill"

type LocalStorageMock = Record<string, Record<string, unknown>>

const { get: originalGet, set: originalSet } = browser.storage.local

/** Puts back the storage that mockLocalStorage and its kin replace. */
export function restoreLocalStorage(): void {
  browser.storage.local.get = originalGet
  browser.storage.local.set = originalSet
}

export function mockLocalStorage(): LocalStorageMock {
  let localStorage: LocalStorageMock = {}

  browser.storage.local.get = jest.fn((key) => {
    if (typeof key === "string" && key in localStorage) {
      return Promise.resolve({ [key]: localStorage[key] })
    }
    return Promise.resolve({})
  })
  browser.storage.local.set = jest.fn(
    (values: Record<string, Record<string, unknown>>) => {
      localStorage = {
        ...localStorage,
        ...values,
      }
      return Promise.resolve()
    },
  )

  return localStorage
}

export function mockLocalStorageWithCalls(): {
  localStorage: LocalStorageMock
  localStorageCalls: Record<string, unknown>[]
} {
  let localStorage: Record<string, Record<string, unknown>> = {}
  const localStorageCalls: Record<string, unknown>[] = []

  browser.storage.local.get = jest.fn((key) => {
    if (typeof key === "string" && key in localStorage) {
      return Promise.resolve({ [key]: localStorage[key] })
    }
    return Promise.resolve({})
  })
  browser.storage.local.set = jest.fn(
    (values: Record<string, Record<string, unknown>>) => {
      localStorage = {
        ...localStorage,
        ...values,
      }
      localStorageCalls.unshift(values)

      return Promise.resolve()
    },
  )

  return { localStorage, localStorageCalls }
}
