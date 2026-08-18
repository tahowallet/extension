import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { waitFor } from "@testing-library/dom"
import { ETHEREUM } from "../../../constants"
import { wait } from "../../../lib/utils"
import SerialFallbackProvider from "../serial-fallback-provider"

const sandbox = sinon.createSandbox()

const callsFor = (stub: Sinon.SinonStub, method: string) =>
  stub.args.filter((args) => args[0] === method)

describe("Serial Fallback Provider", () => {
  let fallbackProvider: SerialFallbackProvider
  let genericSendStub: Sinon.SinonStub
  let boarSendStub: Sinon.SinonStub

  beforeEach(() => {
    const mockGenericProvider = new JsonRpcProvider("fake-rpc-url")
    const mockBoarProvider = new JsonRpcProvider("fake-boar-url")
    genericSendStub = sandbox
      .stub(mockGenericProvider, "send")
      .callsFake(async () => "success")
    boarSendStub = sandbox
      .stub(mockBoarProvider, "send")
      .callsFake(async () => "success")
    // The creator order mirrors what `makeSerialFallbackProvider` builds in
    // production: the Taho-managed (Boar) endpoint leads the serial walk and
    // the stored endpoints sit behind it as fallbacks.
    fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      {
        type: "boar",
        creator: () => mockBoarProvider,
      },
      {
        type: "generic",
        creator: () => mockGenericProvider,
      },
    ])
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("send", () => {
    it("should not call any providers when called with eth_chainId", async () => {
      await fallbackProvider.send("eth_chainId", [])
      expect(boarSendStub.called).toBe(false)
      expect(genericSendStub.called).toBe(false)
    })

    it("should route standard methods to the Taho-managed provider first", async () => {
      boarSendStub.withArgs("eth_getBalance").resolves("boar-balance")

      await expect(
        fallbackProvider.send("eth_getBalance", ["0xDeadBeef", "latest"]),
      ).resolves.toEqual("boar-balance")

      expect(callsFor(boarSendStub, "eth_getBalance").length).toEqual(1)
      expect(callsFor(genericSendStub, "eth_getBalance").length).toEqual(0)
    })

    describe("should use the boar provider for alchemy specific methods", () => {
      it("alchemy_getTokenBalances", async () => {
        await fallbackProvider.send("alchemy_getTokenBalances", [])
        expect(boarSendStub.called).toBe(true)
      })
      it("alchemy_getAssetTransfers", async () => {
        await fallbackProvider.send("alchemy_getAssetTransfers", [])
        expect(boarSendStub.called).toBe(true)
      })
      it("alchemy_getTokenMetadata", async () => {
        await fallbackProvider.send("alchemy_getTokenMetadata", [])
        expect(boarSendStub.called).toBe(true)
      })
      it("alchemy_pendingTransactions", async () => {
        await fallbackProvider.send("alchemy_pendingTransactions", [])
        expect(boarSendStub.called).toBe(true)
      })
      it("eth_subscribe", async () => {
        await fallbackProvider.send("eth_subscribe", [])
        expect(boarSendStub.called).toBe(true)
      })
      it("eth_estimateGas", async () => {
        await fallbackProvider.send("eth_estimateGas", [])
        expect(boarSendStub.called).toBe(true)
      })
    })

    it("should fail over to the next provider on a 4xx client error", async () => {
      // A revoked or placeholder key on the Taho-managed endpoint answers
      // 4xx; the stored endpoints behind it must still serve the call.
      boarSendStub
        .withArgs("eth_getBalance")
        .throws(Object.assign(new Error("bad response"), { status: 403 }))

      await expect(
        fallbackProvider.send("eth_getBalance", ["0xDeadBeef", "latest"]),
      ).resolves.toEqual("success")

      // No same-provider retries: one rejected attempt, then failover.
      expect(callsFor(boarSendStub, "eth_getBalance").length).toEqual(1)
      expect(callsFor(genericSendStub, "eth_getBalance").length).toEqual(1)
    })

    it("should reject a 4xx client error once the walk is exhausted", async () => {
      const error = Object.assign(new Error("bad response"), { status: 403 })
      boarSendStub.withArgs("eth_getBalance").throws(error)
      genericSendStub.withArgs("eth_getBalance").throws(error)

      await expect(
        fallbackProvider.send("eth_getBalance", ["0xDeadBeef", "latest"]),
      ).rejects.toEqual(error)

      // Each provider is tried once; the 4xx is not retried in place.
      expect(callsFor(boarSendStub, "eth_getBalance").length).toEqual(1)
      expect(callsFor(genericSendStub, "eth_getBalance").length).toEqual(1)
    })

    it("should try again if there is a bad response", async () => {
      boarSendStub.onCall(0).throws("bad response")
      boarSendStub.onCall(1).returns(ETHEREUM.chainID)
      boarSendStub.onCall(2).returns("success")

      await waitFor(() => expect(boarSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // eth_chainId is called once in the constructor
      expect(genericSendStub.callCount).toEqual(1)
      expect(boarSendStub.callCount).toEqual(3)
    })

    it("should try again if there is a missing response", async () => {
      boarSendStub.onCall(0).throws("missing response")
      boarSendStub.onCall(1).returns(ETHEREUM.chainID)
      boarSendStub.onCall(2).returns("success")

      await waitFor(() => expect(boarSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // eth_chainId is called once in the constructor
      expect(genericSendStub.callCount).toEqual(1)
      expect(boarSendStub.callCount).toEqual(3)
    })

    it("should try again if provider is rate limited", async () => {
      boarSendStub.onCall(0).throws("we can't execute this request")
      boarSendStub.onCall(1).returns(ETHEREUM.chainID)
      boarSendStub.onCall(2).returns("success")

      await waitFor(() => expect(boarSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // eth_chainId is called once in the constructor
      expect(genericSendStub.callCount).toEqual(1)
      expect(boarSendStub.callCount).toEqual(3)
    })

    it("should switch to next provider after three bad responses", async () => {
      boarSendStub.throws("bad result from backend")
      genericSendStub.onCall(0).returns(ETHEREUM.chainID)
      genericSendStub.onCall(1).returns("success")

      await waitFor(() => expect(boarSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      expect(callsFor(boarSendStub, "eth_getBalance").length).toEqual(4)
      // 1 try of eth_getBalance on the stored endpoint behind Boar
      expect(callsFor(genericSendStub, "eth_getBalance").length).toEqual(1)
    })

    it("should eventually throw if all providers fail", async () => {
      const error = new Error("bad response")
      genericSendStub.throws(error)
      boarSendStub.throws(error)
      await expect(fallbackProvider.send("eth_getBalance", [])).rejects.toEqual(
        error,
      )
      expect(boarSendStub.called).toEqual(true)
      expect(genericSendStub.called).toEqual(true)
    })

    it("should cache and return cached result for eth_getCode", async () => {
      boarSendStub.returns(true)
      const result = await fallbackProvider.send("eth_getCode", [
        "0xDeadBeef",
        "latest",
      ])

      expect(result).toEqual(true)
      expect(boarSendStub.callCount).toEqual(1)

      const result2 = await fallbackProvider.send("eth_getCode", [
        "0xDeadBeef",
        "latest",
      ])
      expect(result2).toEqual(true)
      expect(boarSendStub.callCount).toEqual(1)
    })

    it("should cache and return cached result for eth_getBalance", async () => {
      boarSendStub.returns(123)
      const result = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])

      expect(result).toEqual(123)
      expect(boarSendStub.callCount).toEqual(1)

      const result2 = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])
      expect(result2).toEqual(123)
      expect(boarSendStub.callCount).toEqual(1)
    })

    it("should not cache results for eth_getBalance for longer than 1 second", async () => {
      boarSendStub.returns(123)
      const result = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])

      expect(result).toEqual(123)
      const callCountAfterOneCall = boarSendStub.callCount

      await wait(1_500)

      const result2 = await fallbackProvider.send("eth_getBalance", [
        "0xDeadBeef",
        "latest",
      ])
      expect(result2).toEqual(123)
      expect(boarSendStub.callCount).toBeGreaterThan(callCountAfterOneCall)
    })

    it("should increment the currentProviderIndex when failing over", async () => {
      boarSendStub.throws("bad response")
      genericSendStub.onCall(0).returns(ETHEREUM.chainID)
      genericSendStub.onCall(1).returns("success")

      // Accessing private property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((fallbackProvider as any).currentProviderIndex).toEqual(0)

      await waitFor(() => expect(boarSendStub.called).toEqual(true))

      await expect(
        fallbackProvider.send("eth_getBalance", []),
      ).resolves.toEqual("success")

      // With Boar leading the walk, a failover leaves the provider on the
      // stored endpoint behind it; the periodic primary reconnect is what
      // eventually walks traffic back to index 0.
      // Accessing private property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((fallbackProvider as any).currentProviderIndex).toEqual(1)
    })
  })
})
