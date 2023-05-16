import { HexString } from "@tallyho/tally-background/types"
import {
  Activity,
  INFINITE_VALUE,
} from "@tallyho/tally-background/redux-slices/activities"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { i18n } from "../_locales/i18n"

type ActivityViewDetails = {
  iconClass: "receive" | "send" | "approve" | "swap" | "contract_interaction"
  label: string
  recipient: {
    address?: HexString
    name?: string
  }
  assetLogoURL?: string
  assetSymbol: string
  assetValue: string
}

function isReceiveActivity(activity: Activity, account: string): boolean {
  return (
    activity.type === "asset-transfer" &&
    sameEVMAddress(activity.recipient?.address, account)
  )
}

export default function useActivityViewDetails(
  activity: Activity,
  address: string
): ActivityViewDetails {
  let details
  switch (activity.type) {
    case "asset-transfer":
      details = {
        label: isReceiveActivity(activity, address)
          ? i18n.t("wallet.activities.tokenReceived")
          : i18n.t("wallet.activities.tokenSent"),
        iconClass: isReceiveActivity(activity, address) ? "receive" : "send",
      }
      break
    case "asset-approval":
      details = {
        label: i18n.t("wallet.activities.tokenApproved"),
        iconClass: "approve",
        assetValue:
          activity.value === INFINITE_VALUE
            ? i18n.t("wallet.activities.infiniteApproval")
            : activity.value,
      }
      break
    case "asset-swap":
      details = {
        iconClass: "swap",
        label: i18n.t("wallet.activities.tokenSwapped"),
      }
      break
    case "contract-deployment":
    case "contract-interaction":
    default:
      details = {
        iconClass: "contract_interaction",
        label: i18n.t("wallet.activities.contractInteraction"),
      }
  }
  return {
    recipient: activity.recipient,
    assetLogoURL: activity.assetLogoUrl,
    assetSymbol: activity.assetSymbol,
    assetValue: activity.value,
    ...details,
  } as ActivityViewDetails
}
