import { shouldRefreshKnownAsset } from ".."
import { createSmartContractAsset } from "../../../../tests/factories"
import * as featureFlags from "../../../../features"

const ADDRESS = "0x0000000000000000000000000000000000000000"
const DISCOVERY_TX_HASH = "0x0000000000000000000000000000000000000000"
const METADATA_TX = {
  discoveryTxHash: {
    [ADDRESS]: DISCOVERY_TX_HASH,
  },
}
const METADATA_VERIFIED = {
  verified: true,
}

const TRUSTED_ASSET = createSmartContractAsset()
const UNTRUSTED_ASSET = createSmartContractAsset({
  metadata: { tokenLists: [] },
})

describe("IndexingService utils", () => {
  describe("shouldRefreshKnownAsset", () => {
    beforeAll(() => {
      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
    })

    it("Refresh the untrusted asset if manually imported", () => {
      const shouldBeRefreshed = shouldRefreshKnownAsset(
        UNTRUSTED_ASSET,
        METADATA_VERIFIED
      )

      expect(shouldBeRefreshed).toBe(true)
    })

    it("Not refresh the untrusted asset if not manually imported", () => {
      const shouldBeRefreshed = shouldRefreshKnownAsset(UNTRUSTED_ASSET, {})

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Not refresh the trusted asset if not manually imported", () => {
      const shouldBeRefreshed = shouldRefreshKnownAsset(TRUSTED_ASSET, {})

      expect(shouldBeRefreshed).toBe(false)
    })

    // This state is not quite possible in the app because the user is not able to manually import a trusted asset that exists.
    it("Not refresh the trusted asset if manually imported", () => {
      const shouldBeRefreshed = shouldRefreshKnownAsset(
        TRUSTED_ASSET,
        METADATA_VERIFIED
      )

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Refresh the untrusted asset if it does not already have a discovered tx hash", () => {
      const shouldBeRefreshed = shouldRefreshKnownAsset(
        UNTRUSTED_ASSET,
        METADATA_TX
      )

      expect(shouldBeRefreshed).toBe(true)
    })

    it("Not refresh the trusted asset if it does not already have a discovered tx hash", () => {
      const shouldBeRefreshed = shouldRefreshKnownAsset(
        TRUSTED_ASSET,
        METADATA_TX
      )

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Not refresh the untrusted asset if it does already have a discovered tx hash", () => {
      const asset = {
        ...UNTRUSTED_ASSET,
        metadata: { ...UNTRUSTED_ASSET, ...METADATA_TX },
      }
      const shouldBeRefreshed = shouldRefreshKnownAsset(asset, METADATA_TX)

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Not refresh the trusted asset if it does already have a discovered tx hash", () => {
      const asset = {
        ...TRUSTED_ASSET,
        metadata: { ...TRUSTED_ASSET, ...METADATA_TX },
      }
      const shouldBeRefreshed = shouldRefreshKnownAsset(asset, METADATA_TX)

      expect(shouldBeRefreshed).toBe(false)
    })

    it("Not refresh the trusted asset if discovered tx hash is not specified", () => {
      const asset = {
        ...TRUSTED_ASSET,
        metadata: { ...TRUSTED_ASSET, ...METADATA_TX },
      }

      expect(shouldRefreshKnownAsset(TRUSTED_ASSET, {})).toBe(false)
      expect(shouldRefreshKnownAsset(asset, {})).toBe(false)
    })
    it("Not refresh the untrusted asset if discovered tx hash is not specified", () => {
      const asset = {
        ...UNTRUSTED_ASSET,
        metadata: { ...UNTRUSTED_ASSET, ...METADATA_TX },
      }

      expect(shouldRefreshKnownAsset(UNTRUSTED_ASSET, {})).toBe(false)
      expect(shouldRefreshKnownAsset(asset, {})).toBe(false)
    })
  })
})
