import * as util from "util"
import Dexie from "dexie"
import { IDBKeyRange } from "fake-indexeddb"
import logger, { LogLevel } from "@tallyho/tally-background/lib/logger"
import { readFileSync } from "fs"

const IS_CI = process.env.CI === "true"

// When running tests, bun will point to each expectation that failed for failed tests in the
// console output. For this reason, we want to minimize the amount of messages logged during
// CI workflows to get an overview of both failed expectations and possible errors.
// This is not the case during development, hence, we set the minimum log level to warning
// as it helps with debugging while writing new tests.
logger.logLevel = IS_CI ? LogLevel.off : LogLevel.warn

// Ensure TextEncoder/TextDecoder are available on window (jsdom may not
// provide full implementations).
Object.defineProperty(window, "TextEncoder", {
  writable: true,
  value: util.TextEncoder,
})
Object.defineProperty(window, "TextDecoder", {
  writable: true,
  value: util.TextDecoder,
})

// Mock navigator.usb on both window.navigator and the global navigator
// (bun has its own native navigator that may differ from jsdom's).
const usbMock = {
  getDevices: () => [],
  addEventListener: () => {},
}
Object.defineProperty(window.navigator, "usb", {
  writable: true,
  value: usbMock,
})
if (globalThis.navigator && globalThis.navigator !== window.navigator) {
  Object.defineProperty(globalThis.navigator, "usb", {
    writable: true,
    value: usbMock,
  })
}

// Prevent Dexie from caching indexedDB/IDBKeyRange globals so fake-indexeddb
// can reset properly. This is needed because ESM module evaluation order
// doesn't guarantee fake-indexeddb/auto runs before dexie initializes.
Object.defineProperty(Dexie.dependencies, "indexedDB", {
  get: () => indexedDB,
})
Object.defineProperty(Dexie.dependencies, "IDBKeyRange", {
  get: () => globalThis.IDBKeyRange ?? IDBKeyRange,
})

// Stub fetch calls but allow wasm files to be loaded.
// Override both window.fetch and globalThis.fetch since modules like
// argon2-browser call the global fetch() directly.
const fetchStub = async (
  url: string,
): Promise<{ status: number; body: string | Buffer } | undefined> => {
  if (url.endsWith(".wasm")) {
    const file = readFileSync(url)
    return {
      status: 200,
      body: file,
    }
  }
  // oxlint-disable-next-line no-console
  console.warn("Uncaught fetch call to: \n", url)
  return undefined
}

Object.defineProperty(window, "fetch", { writable: true, value: fetchStub })
Object.defineProperty(globalThis, "fetch", { writable: true, value: fetchStub })
