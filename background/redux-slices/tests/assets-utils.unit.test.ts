import { MATIC, OPTIMISTIC_ETH, AVAX, ETH, BNB } from "../../constants"
import {
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
  getBuiltInNetworkBaseAsset,
  sameNetworkBaseAsset,
} from "../utils/asset-utils"
import { NetworkBaseAsset } from "../../networks"
import { createAssetAmount, createPricePoint } from "../../tests/factories"

describe(sameNetworkBaseAsset, () => {
  test("should handle built in network base assets", () => {
    expect(sameNetworkBaseAsset(MATIC, MATIC)).toBe(true)

    expect(sameNetworkBaseAsset(OPTIMISTIC_ETH, OPTIMISTIC_ETH)).toBe(true)
  })

  test("should handle other network base assets", () => {
    const baseAsset: NetworkBaseAsset = {
      chainID: "111",
      name: "Tally",
      symbol: "TULLY",
      decimals: 18,
    }

    expect(sameNetworkBaseAsset(MATIC, baseAsset)).toBe(false)
    expect(
      sameNetworkBaseAsset(AVAX, {
        chainID: "43114",
        name: "Avalanche",
        symbol: "AVAX",
      }),
    ).toBe(true)
  })
})

describe(getBuiltInNetworkBaseAsset, () => {
  test("should return base asset data for builtin networks", () => {
    expect(getBuiltInNetworkBaseAsset("ETH", "1")).toBe(ETH)
    expect(getBuiltInNetworkBaseAsset("BNB", "56")).toBe(BNB)
  })
})

describe(formatCurrencyAmount, () => {
  test("should return the localized currency amount without the symbol", () => {
    expect(formatCurrencyAmount("USD", 100, 2)).toBe("100.00")
  })
})

describe(enrichAssetAmountWithMainCurrencyValues, () => {
  test("should add localized price and currency data to an asset amount", () => {
    const assetAmount = createAssetAmount()
    const pricePoint = createPricePoint(assetAmount.asset, 1637.7)

    const result = enrichAssetAmountWithMainCurrencyValues(
      assetAmount,
      pricePoint,
      2,
    )

    expect(result).toMatchObject({
      ...assetAmount,
      localizedMainCurrencyAmount: "1,637.70",
      localizedUnitPrice: "1,637.70",
      mainCurrencyAmount: 1637.7,
      unitPrice: 1637.7,
    })
  })
})
