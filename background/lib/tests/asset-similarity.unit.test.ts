import {
  createNetworkBaseAsset,
  createSmartContractAsset,
} from "../../tests/factories"
import { mergeAssets } from "../asset-similarity"

describe("Asset Similarity", () => {
  describe("mergeAssets", () => {
    it("Should preserve coinType when merging assets", () => {
      const mergedAsset = mergeAssets(
        createSmartContractAsset(),
        createNetworkBaseAsset(),
      )

      expect("coinType" in mergedAsset).toBe(true)
    })
  })
})
