import {
  injectTallyWindowProvider,
  connectProviderBridge,
} from "@tallyho/provider-bridge"
import monitorForWalletConnectionPrompts from "@tallyho/provider-bridge/wallet-connection-handlers"

injectTallyWindowProvider()
connectProviderBridge()
monitorForWalletConnectionPrompts()
