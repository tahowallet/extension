import sinon from "sinon"
import SerialFallbackProvider, * as serialFallbackProvider from "@tallyho/tally-background/services/chain/serial-fallback-provider"
import { makeSerialFallbackProvider } from "@tallyho/tally-background/tests/factories"

const sandbox = sinon.createSandbox()
/* Reset IndexedDB between tests */
beforeEach(() => {
  sandbox.restore()
  sandbox
    .stub(serialFallbackProvider, "makeSerialFallbackProvider")
    .callsFake(() => {
      return makeSerialFallbackProvider() as SerialFallbackProvider
    })
  global.indexedDB = new IDBFactory()
})

/* Reset IndexedDB between tests */
afterEach(() => {
  global.indexedDB = new IDBFactory()
})
