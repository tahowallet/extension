import * as util from "util"
// eslint-disable-next-line import/no-extraneous-dependencies
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
    onAlarm: {
      addListener: () => {},
    },
  },
})

/* Prevent Dexie from caching indexedDB global so fake-indexeddb can reset properly */
Object.defineProperty(Dexie.dependencies, "indexedDB", {
  get: () => indexedDB,
})
