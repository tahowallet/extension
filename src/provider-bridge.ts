import {
  injectTallyWindowProvider,
  connectProviderBridge,
} from "@tallyho/provider-bridge"

injectTallyWindowProvider().then(() => {
  connectProviderBridge()
})
