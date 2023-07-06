import { allowVerifyUntrustedAssetByManualImport } from ".."
import { createSmartContractAsset } from "../../../../tests/factories"
import * as featureFlags from "../../../../features"

const TRUSTED_ASSET = createSmartContractAsset()
const UNTRUSTED_ASSET = createSmartContractAsset({
  metadata: { tokenLists: [] },
})

describe("IndexingService utils", () => {
  describe("allowVerifyUntrustedAssetByManualImport", () => {
    beforeAll(() => {
      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
    })

    it("Refresh the untrusted asset if manually imported", () => {
      const shouldBeRefreshed = allowVerifyUntrustedAssetByManualImport(
        UNTRUSTED_ASSET,
        true
      )

      expect(shouldBeRefreshed).toBe(true)
    })

    it("Not refresh the untrusted asset if not manually imported", () => {
      const shouldBeRefreshed = allowVerifyUntrustedAssetByManualImport(
        UNTRUSTED_ASSET,
        false
      )

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Not refresh the trusted asset if not manually imported", () => {
      const shouldBeRefreshed = allowVerifyUntrustedAssetByManualImport(
        TRUSTED_ASSET,
        false
      )

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Not refresh the trusted asset if manually imported", () => {
      const shouldBeRefreshed = allowVerifyUntrustedAssetByManualImport(
        TRUSTED_ASSET,
        true
      )

      expect(shouldBeRefreshed).toBe(false)
    })
  })
})
