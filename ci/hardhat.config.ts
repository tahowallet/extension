import { HardhatUserConfig } from "hardhat/config"
import "dotenv-defaults/config"

/* eslint-disable @typescript-eslint/no-var-requires */
require(`dotenv-defaults`).config({
  path: "../.env",
  defaults: "../.env.defaults",
})

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.ALCHEMY_URL,
        blockNumber: 17094516,
      },
      chainId: parseInt(process.env.MAINNET_FORK_CHAIN_ID ?? "1337", 10), // using Hardhat's default `31337` I couldn't make txs (no changes to balance).
    },
  },
}

export default config
