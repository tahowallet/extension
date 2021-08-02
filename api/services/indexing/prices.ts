import { getDB } from "./db"
import { CoinGeckoAsset } from "../../types"
import { getPrices } from "../../lib/prices"
import { BTC, ETH, FIAT_CURRENCIES } from "../../constants"

export async function handleAlarm(): Promise<void> {
  const db = await getDB()
  // ETH and BTC vs major currencies
  const pricePoints = await getPrices(
    [BTC, ETH] as CoinGeckoAsset[],
    FIAT_CURRENCIES
  )
  // kick off db writes, don't wait for the promises to settle
  pricePoints.forEach((pricePoint) =>
    db.savePriceMeasurement(pricePoint, Date.now(), "coingecko")
  )

  // TODO get the prices of all tokens to track and save them
}
