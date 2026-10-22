import AssetDataHelper from "../asset-data-helper"
import SerialFallbackProvider from "../serial-fallback-provider"
import { getAssetTransfers as getBoarAssetTransfers } from "../../../lib/boar"
import { getAssetTransfersViaLogs } from "../../../lib/erc20-transfer-logs"
import { createAddressOnNetwork } from "../../../tests/factories"

jest.mock("../../../lib/boar", () => ({
  getAssetTransfers: jest.fn(async () => []),
  getTokenBalances: jest.fn(async () => []),
  getTokenMetadata: jest.fn(async () => undefined),
}))

jest.mock("../../../lib/erc20-transfer-logs", () => ({
  getAssetTransfersViaLogs: jest.fn(async () => []),
}))

const mockedBoarAssetTransfers = getBoarAssetTransfers as jest.Mock
const mockedLogAssetTransfers = getAssetTransfersViaLogs as jest.Mock

const makeHelperWithProvider = (provider: Partial<SerialFallbackProvider>) =>
  new AssetDataHelper({
    providerForNetwork: () => provider as SerialFallbackProvider,
  })

describe("AssetDataHelper", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getAssetTransfers", () => {
    it("uses the Alchemy-compatible helper when the provider supports it", async () => {
      const helper = makeHelperWithProvider({ supportsAlchemy: true })
      const addressOnNetwork = createAddressOnNetwork()

      await helper.getAssetTransfers(addressOnNetwork, 0, 100)

      // Incoming and outgoing lookups.
      expect(mockedBoarAssetTransfers).toHaveBeenCalledTimes(2)
      expect(mockedLogAssetTransfers).not.toHaveBeenCalled()
    })

    it("only looks up incoming transfers when incomingOnly is set", async () => {
      const helper = makeHelperWithProvider({ supportsAlchemy: true })
      const addressOnNetwork = createAddressOnNetwork()

      await helper.getAssetTransfers(addressOnNetwork, 0, 100, true)

      expect(mockedBoarAssetTransfers).toHaveBeenCalledTimes(1)
      expect(mockedBoarAssetTransfers).toHaveBeenCalledWith(
        expect.anything(),
        addressOnNetwork,
        "incoming",
        0,
        100,
      )
    })

    it("falls back to Transfer log scanning without Alchemy support", async () => {
      const provider = {
        supportsAlchemy: false,
        getBlockNumber: jest.fn(async () => 100),
      }
      const helper = makeHelperWithProvider(
        provider as unknown as Partial<SerialFallbackProvider>,
      )
      const addressOnNetwork = createAddressOnNetwork()

      await helper.getAssetTransfers(addressOnNetwork, 0, 50)

      expect(mockedBoarAssetTransfers).not.toHaveBeenCalled()
      expect(mockedLogAssetTransfers).toHaveBeenCalledWith(
        provider,
        addressOnNetwork,
        0,
        50,
        false,
      )
    })

    it("resolves the end block for log scanning when none is given", async () => {
      const provider = {
        supportsAlchemy: false,
        getBlockNumber: jest.fn(async () => 123),
      }
      const helper = makeHelperWithProvider(
        provider as unknown as Partial<SerialFallbackProvider>,
      )
      const addressOnNetwork = createAddressOnNetwork()

      await helper.getAssetTransfers(addressOnNetwork, 0)

      expect(provider.getBlockNumber).toHaveBeenCalled()
      expect(mockedLogAssetTransfers).toHaveBeenCalledWith(
        provider,
        addressOnNetwork,
        0,
        123,
        false,
      )
    })

    it("falls back to Transfer log scanning when the Alchemy path fails", async () => {
      // A mistagged endpoint — one advertising the enhanced API without
      // serving it — must not permanently disable transfer discovery for the
      // network; the standard-RPC path is still available.
      mockedBoarAssetTransfers.mockRejectedValue(
        new Error("Unsupported method: alchemy_getAssetTransfers"),
      )

      const provider = {
        supportsAlchemy: true,
        getBlockNumber: jest.fn(async () => 100),
      }
      const helper = makeHelperWithProvider(
        provider as unknown as Partial<SerialFallbackProvider>,
      )
      const addressOnNetwork = createAddressOnNetwork()

      await expect(
        helper.getAssetTransfers(addressOnNetwork, 0, 50),
      ).resolves.toEqual([])

      expect(mockedLogAssetTransfers).toHaveBeenCalledWith(
        provider,
        addressOnNetwork,
        0,
        50,
        false,
      )
    })

    it("rejects when both the Alchemy path and the log fallback fail", async () => {
      // The log fallback still rethrows, which is what lets callers like
      // ChainService manage their own retries.
      mockedBoarAssetTransfers.mockRejectedValue(new Error("bad capability"))
      const logsError = new Error("range too wide")
      mockedLogAssetTransfers.mockRejectedValueOnce(logsError)

      const helper = makeHelperWithProvider({
        supportsAlchemy: true,
        getBlockNumber: jest.fn(async () => 100),
      } as unknown as Partial<SerialFallbackProvider>)

      await expect(
        helper.getAssetTransfers(createAddressOnNetwork(), 0, 50),
      ).rejects.toEqual(logsError)
    })

    it("rethrows log-scanning errors so callers can manage retries", async () => {
      const error = new Error("range too wide")
      mockedLogAssetTransfers.mockRejectedValueOnce(error)

      const helper = makeHelperWithProvider({
        supportsAlchemy: false,
        getBlockNumber: jest.fn(async () => 100),
      } as unknown as Partial<SerialFallbackProvider>)

      await expect(
        helper.getAssetTransfers(createAddressOnNetwork(), 0, 50),
      ).rejects.toEqual(error)
    })
  })
})
