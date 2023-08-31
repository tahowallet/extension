import * as util from "util"
import Dexie from "dexie"
import logger, { LogLevel } from "@tallyho/tally-background/lib/logger"
import { readFileSync } from "fs"
import { webcrypto } from "crypto"

const IS_CI = process.env.CI === "true"

// When running tests, Jest will point to each expectation that failed for failed tests in the
// console output. For this reason, we want to minimize the amount of messages logged during
// CI workflows to get an overview of both failed expectations and possible errors.
// This is not the case during development, hence, we set the minimum log level to warning
// as it helps with debugging while writing new tests.
logger.logLevel = IS_CI ? LogLevel.error : LogLevel.warn

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

// Stub fetch calls but allow wasm files to be loaded.
Object.defineProperty(window, "fetch", {
  writable: true,
  value: async (
    url: string,
  ): Promise<{ status: number; body: string | Buffer } | undefined> => {
    if (url.endsWith(".wasm")) {
      const file = readFileSync(url)
      return {
        status: 200,
        body: file,
      }
    }
    // eslint-disable-next-line no-console
    console.warn("Uncaught fetch call to: \n", url)
    return undefined
  },
})

// Below, we replace any existing crypto.subtle implementation with the Node
// one. jsdom ships with an ad hoc, informally-specified, bug-ridden
// implementation of half of WebCrypto, but that includes securing the `crypto`
// variable to prevent it from being replaced, which manes we have to dig into
// the object instead of being able to replace the top-level variable.
Object.defineProperty(globalThis.crypto, "subtle", {
  writable: true,
  value: (webcrypto as unknown as Crypto).subtle,
})
