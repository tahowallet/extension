import {
  injectTallyWindowProvider,
  connectProviderBridge,
} from "@tallyho/tally-provider-bridge"

injectTallyWindowProvider().then(() => {
  connectProviderBridge()
})
