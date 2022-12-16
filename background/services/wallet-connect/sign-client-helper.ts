import SignClient from "@walletconnect/sign-client"

export default function createSignClient(): Promise<SignClient> {
  return SignClient.init({
    logger: "debug", // TODO: set from .env
    projectId: "9ab2e13df08600b06ac588e1292d6512", // TODO: set from .env
    relayUrl: "wss://relay.walletconnect.com",
    metadata: {
      // TODO: customize this metadata
      name: "Tally Ho Wallet",
      description: "WalletConnect for Tally Ho wallet",
      url: "https://walletconnect.com/",
      icons: ["https://avatars.githubusercontent.com/u/37784886"],
    },
  })
}
