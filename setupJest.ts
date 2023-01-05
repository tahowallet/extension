import * as util from "util"
import Dexie from "dexie"

// ref: https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
// ref: https://github.com/jsdom/jsdom/issues/2524
Object.defineProperty(window, "TextEncoder", {
  writable: true,
  value: util.TextEncoder,
})
Object.defineProperty(window, "TextDecoder", {
  writable: true,
  value: util.TextDecoder,
})

Object.defineProperty(window.navigator, "usb", {
  writable: true,
  value: {
    getDevices: () => [],
    addEventListener: () => {},
  },
})

// Prevent Dexie from caching indexedDB global so fake-indexeddb
// can reset properly.
Object.defineProperty(Dexie.dependencies, "indexedDB", {
  get: () => indexedDB,
})

// Stub fetch calls
Object.defineProperty(window, "fetch", {
  writable: true,
  value: (url: string) => {
    // eslint-disable-next-line no-console
    console.warn("Uncaught fetch call to: \n", url)
  },
})
