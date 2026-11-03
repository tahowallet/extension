import type { Activity } from "@tallyho/tally-background/redux-slices/activities"

/**
 * Checks whether an activity involves the given asset. An activity involves
 * the asset if it is a transfer or approval of it, a swap from it, or any
 * transaction sent to the asset's contract.
 */
// oxlint-disable-next-line import/prefer-default-export
export function activityInvolvesAsset(
  activity: Activity,
  symbol: string,
  contractAddress: string | undefined,
): boolean {
  if (contractAddress !== undefined && contractAddress === activity.to) {
    return true
  }
  switch (activity?.type) {
    case "asset-transfer":
    case "asset-approval":
      return activity.assetSymbol === symbol
    case "asset-swap":
      // TODO: this should recognize both assets of the swap but it is
      // ignored right now as swaps are recognized as contract interactions
      return activity.assetSymbol === symbol
    case "contract-interaction":
    case "contract-deployment":
    default:
      return false
  }
}
