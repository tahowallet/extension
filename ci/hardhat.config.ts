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
        url: process.env.CHAIN_API_URL || "",
        blockNumber: parseInt(process.env.FORKING_BLOCK ?? "", 10),
      },
      chainId: parseInt(process.env.MAINNET_FORK_CHAIN_ID ?? "1337", 10),
    },
  },
}

export default config
