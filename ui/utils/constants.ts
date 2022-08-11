import {
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"

export const doggoTokenDecimalDigits = 18

export const scanWebsite = {
  [ETHEREUM.chainID]: { title: "Etherscan", url: "https://etherscan.io" },
  [OPTIMISM.chainID]: {
    title: "Etherscan",
    url: "https://optimistic.etherscan.io",
  },
  [POLYGON.chainID]: { title: "Polygonscan", url: "https://polygonscan.com" },
}
