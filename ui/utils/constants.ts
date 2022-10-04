import {
  ARBITRUM_ONE,
  ETHEREUM,
  GOERLI,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { NetworkFeeTypeChosen } from "@tallyho/tally-background/redux-slices/transaction-construction"
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
  [ARBITRUM_ONE.chainID]: {
    title: "Arbiscan",
    url: "https://arbiscan.io/",
  },
}

export const ESTIMATED_SPEED_IN_READABLE_FORMAT_RELATIVE_TO_CONFIDENCE_LEVEL: {
  [confidence: number]: string
} = {
  0: i18n.t("networkFees.speeds.0"),
  70: i18n.t("networkFees.speeds.70"),
  95: i18n.t("networkFees.speeds.95"),
  99: i18n.t("networkFees.speeds.99"),
}

export const NETWORK_FEE_CHOSEN_TYPE_TO_HUMAN_READABLE_TYPE: {
  [confidence: string]: string
} = {
  [NetworkFeeTypeChosen.Regular]: i18n.t("networkFees.types.regular"),
  [NetworkFeeTypeChosen.Express]: i18n.t("networkFees.types.express"),
  [NetworkFeeTypeChosen.Instant]: i18n.t("networkFees.types.instant"),
  [NetworkFeeTypeChosen.Custom]: i18n.t("networkFees.types.custom"),
}
