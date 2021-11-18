import {
  injectTallyWindowProvider,
  setupConnection,
} from "@tallyho/tally-provider-bridge"

injectTallyWindowProvider().then(() => {
  setupConnection()
})
