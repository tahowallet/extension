import { ActivityItem } from "@tallyho/tally-background/redux-slices/activities"

export function determineActivityValue(activityItem: ActivityItem) {
  const { asset } = activityItem
  let { value } = activityItem
  // Derive value from transaction transfer input if not ETH
  if (asset && !asset.symbol.includes("ETH") && activityItem?.input) {
    const isSwap =
      activityItem.input.includes("0x38") || activityItem.input.includes("0x18")

    if (!isSwap) {
      value = BigInt(parseInt(activityItem.input.slice(-64), 16))
    } else {
      value = BigInt(parseInt(activityItem.input.slice(10).slice(0, 64), 16))
    }
  }
  return value
}

export default determineActivityValue
