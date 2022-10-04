import * as util from "util"
import Dexie from "dexie"
import { Tabs } from "webextension-polyfill"

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

Object.defineProperty(window, "navigator", {
  writable: true,
  value: {
    usb: {
      getDevices: () => [],
      addEventListener: () => {},
    },
  },
})

Object.defineProperty(browser, "alarms", {
  writable: true,
  value: {
    create: () => {},
    clear: () => {},
    onAlarm: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
})

// Mock top-level logger calls.
browser.extension.getBackgroundPage = jest.fn()
browser.tabs.getCurrent = jest.fn(() =>
  // getCurrent can return undefined if there is no tab, and we act accordingly
  // in the code.
  Promise.resolve(undefined as unknown as Tabs.Tab)
)

// Prevent Dexie from caching indexedDB global so fake-indexeddb
// can reset properly.
Object.defineProperty(Dexie.dependencies, "indexedDB", {
  get: () => indexedDB,
})
