import {
  ETHEREUM,
  GOERLI,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { i18n } from "../_locales/i18n"

export const doggoTokenDecimalDigits = 18

export const scanWebsite = {
  [ETHEREUM.chainID]: { title: "Etherscan", url: "https://etherscan.io" },
  [OPTIMISM.chainID]: {
    title: "Etherscan",
    url: "https://optimistic.etherscan.io",
  },
  [POLYGON.chainID]: { title: "Polygonscan", url: "https://polygonscan.com" },
  [GOERLI.chainID]: { title: "Etherscan", url: "https://goerli.etherscan.io/" },
}

export const ESTIMATED_SPEED_IN_READABLE_FORMAT_RELATIVE_TO_CONFIDENCE_LEVEL: {
  [confidence: number]: string
} = {
  0: i18n.t("networkFees.speeds.0"),
  70: i18n.t("networkFees.speeds.70"),
  95: i18n.t("networkFees.speeds.95"),
  99: i18n.t("networkFees.speeds.99"),
}
