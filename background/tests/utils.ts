import browser from "webextension-polyfill"
// eslint-disable-next-line import/no-extraneous-dependencies
export { waitFor } from "@testing-library/dom"

type LocalStorageMock = Record<string, Record<string, unknown>>

export function mockLocalStorage(): LocalStorageMock {
  let localStorage: LocalStorageMock = {}

  browser.storage.local.get = jest.fn((key) => {
    if (typeof key === "string" && key in localStorage) {
      return Promise.resolve({ [key]: localStorage[key] } || {})
    }
    return Promise.resolve({})
  })
  browser.storage.local.set = jest.fn((values) => {
    localStorage = {
      ...localStorage,
      ...values,
    }
    return Promise.resolve()
  })

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
      return Promise.resolve({ [key]: localStorage[key] } || {})
    }
    return Promise.resolve({})
  })
  browser.storage.local.set = jest.fn((values) => {
    localStorage = {
      ...localStorage,
      ...values,
    }
    localStorageCalls.unshift(values)

    return Promise.resolve()
  })

  return { localStorage, localStorageCalls }
}
