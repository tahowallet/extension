import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { waitFor } from "@testing-library/dom"
import { ETHEREUM } from "../../../constants"
import { wait } from "../../../lib/utils"
import SerialFallbackProvider from "../serial-fallback-provider"

const sandbox = sinon.createSandbox()

describe("Serial Fallback Provider", () => {
  let fallbackProvider: SerialFallbackProvider
  let genericSendStub: Sinon.SinonStub
  let alchemySendStub: Sinon.SinonStub

  beforeEach(() => {
    const mockGenericProvider = new JsonRpcProvider("fake-rpc-url")
    const mockAlchemyProvider = new JsonRpcProvider("fake-alchemy-url")
    genericSendStub = sandbox
      .stub(mockGenericProvider, "send")
      .callsFake(async () => "success")
    alchemySendStub = sandbox
      .stub(mockAlchemyProvider, "send")
      .callsFake(async () => "success")
    fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      {
        type: "generic",
        creator: () => mockGenericProvider,
      },
      {
        type: "alchemy",
        creator: () => mockAlchemyProvider,
      },
    ])
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("send", () => {
    it("should not call any providers when called with eth_chainId", async () => {
      await fallbackProvider.send("eth_chainId", [])
      expect(alchemySendStub.called).toBe(false)
      expect(genericSendStub.called).toBe(false)
    })

    describe("should use the alchemy provider for alchemy specific methods", () => {
      it("alchemy_getTokenBalances", async () => {
        await fallbackProvider.send("alchemy_getTokenBalances", [])
        expect(alchemySendStub.called).toBe(true)
      })
      it("alchemy_getAssetTransfers", async () => {
        await fallbackProvider.send("alchemy_getAssetTransfers", [])
        expect(alchemySendStub.called).toBe(true)
      })
      it("alchemy_getTokenMetadata", async () => {
        await fallbackProvider.send("alchemy_getTokenMetadata", [])
        expect(alchemySendStub.called).toBe(true)
      })
      it("alchemy_pendingTransactions", async () => {
        await fallbackProvider.send("alchemy_pendingTransactions", [])
        expect(alchemySendStub.called).toBe(true)
      })
      it("eth_subscribe", async () => {
        await fallbackProvider.send("eth_subscribe", [])
        expect(alchemySendStub.called).toBe(true)
      })
      it("eth_estimateGas", async () => {
        await fallbackProvider.send("eth_estimateGas", [])
        expect(alchemySendStub.called).toBe(true)
      })
    })

    it("should try again if there is a bad response", async () => {
      genericSendStub.onCall(0).throws("bad response")
      genericSendStub.onCall(1).returns(ETHEREUM.chainID)
      genericSendStub.onCall(2).returns("success")

      await waitFor(() => expect(genericSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // eth_chainId is called once in the constructor
      expect(alchemySendStub.callCount).toEqual(1)
      expect(genericSendStub.callCount).toEqual(3)
    })

    it("should try again if there is a missing response", async () => {
      genericSendStub.onCall(0).throws("missing response")
      genericSendStub.onCall(1).returns(ETHEREUM.chainID)
      genericSendStub.onCall(2).returns("success")

      await waitFor(() => expect(genericSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // eth_chainId is called once in the constructor
      expect(alchemySendStub.callCount).toEqual(1)
      expect(genericSendStub.callCount).toEqual(3)
    })

    it("should try again if provider is rate limited", async () => {
      genericSendStub.onCall(0).throws("we can't execute this request")
      genericSendStub.onCall(1).returns(ETHEREUM.chainID)
      genericSendStub.onCall(2).returns("success")

      await waitFor(() => expect(genericSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // eth_chainId is called once in the constructor
      expect(alchemySendStub.callCount).toEqual(1)
      expect(genericSendStub.callCount).toEqual(3)
    })

    it("should switch to next provider after three bad responses", async () => {
      genericSendStub.throws("bad result from backend")
      alchemySendStub.onCall(0).returns(ETHEREUM.chainID)
      alchemySendStub.onCall(1).returns("success")

      await waitFor(() => expect(genericSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      expect(
        genericSendStub.args.filter((args) => args[0] === "eth_getBalance")
          .length,
      ).toEqual(4)
      // 1 try of eth_getBalance
      expect(
        alchemySendStub.args.filter((args) => args[0] === "eth_getBalance")
          .length,
      ).toEqual(1)
    })

    it("should eventually throw if all providers fail", async () => {
      const error = new Error("bad response")
      genericSendStub.throws(error)
      alchemySendStub.throws(error)
      await expect(fallbackProvider.send("eth_getBalance", [])).rejects.toEqual(
        error,
      )
      expect(genericSendStub.called).toEqual(true)
      expect(alchemySendStub.called).toEqual(true)
    })

    it("should cache and return cached result for eth_getCode", async () => {
      genericSendStub.returns(true)
      const result = await fallbackProvider.send("eth_getCode", [
        "0xDeadBeef",
        "latest",
      ])

      expect(result).toEqual(true)
      expect(genericSendStub.callCount).toEqual(1)

      const result2 = await fallbackProvider.send("eth_getCode", [
        "0xDeadBeef",
        "latest",
      ])
      expect(result2).toEqual(true)
      expect(genericSendStub.callCount).toEqual(1)
    })

    it("should cache and return cached result for eth_getBalance", async () => {
      genericSendStub.returns(123)
      const result = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])

      expect(result).toEqual(123)
      expect(genericSendStub.callCount).toEqual(1)

      const result2 = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])
      expect(result2).toEqual(123)
      expect(genericSendStub.callCount).toEqual(1)
    })

    it("should not cache results for eth_getBalance for longer than 1 second", async () => {
      genericSendStub.returns(123)
      const result = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])

      expect(result).toEqual(123)
      const callCountAfterOneCall = genericSendStub.callCount

      await wait(1_500)

      const result2 = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])
      expect(result2).toEqual(123)
      expect(genericSendStub.callCount).toBeGreaterThan(callCountAfterOneCall)
    })

    it("should increment the currentProviderIndex when failing over", async () => {
      genericSendStub.throws("bad response")
      alchemySendStub.onCall(0).returns(ETHEREUM.chainID)
      alchemySendStub.onCall(1).returns("success")

      // Accessing private property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((fallbackProvider as any).currentProviderIndex).toEqual(0)

      await waitFor(() => expect(genericSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")
      // Accessing private property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((fallbackProvider as any).currentProviderIndex).toEqual(0)
    })
  })
})
