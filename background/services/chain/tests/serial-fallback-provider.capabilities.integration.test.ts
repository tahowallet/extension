import { JsonRpcProvider } from "@ethersproject/providers"
import Sinon, * as sinon from "sinon"
import { ETHEREUM } from "../../../constants"
import SerialFallbackProvider from "../serial-fallback-provider"

const sandbox = sinon.createSandbox()

const callsFor = (stub: Sinon.SinonStub, method: string) =>
  stub.args.filter((args) => args[0] === method)

describe("Serial Fallback Provider capability routing", () => {
  let plainProvider: JsonRpcProvider
  let plainSendStub: Sinon.SinonStub
  let alchemyProvider: JsonRpcProvider
  let alchemySendStub: Sinon.SinonStub
  let secondAlchemyProvider: JsonRpcProvider
  let secondAlchemySendStub: Sinon.SinonStub
  let boarProvider: JsonRpcProvider
  let boarSendStub: Sinon.SinonStub

  beforeEach(() => {
    plainProvider = new JsonRpcProvider("fake-rpc-url")
    alchemyProvider = new JsonRpcProvider("fake-alchemy-url")
    secondAlchemyProvider = new JsonRpcProvider("fake-alchemy-url-2")
    boarProvider = new JsonRpcProvider("fake-boar-url")

    plainSendStub = sandbox
      .stub(plainProvider, "send")
      .callsFake(async () => "plain")
    alchemySendStub = sandbox
      .stub(alchemyProvider, "send")
      .callsFake(async () => "alchemy")
    secondAlchemySendStub = sandbox
      .stub(secondAlchemyProvider, "send")
      .callsFake(async () => "alchemy-2")
    boarSendStub = sandbox
      .stub(boarProvider, "send")
      .callsFake(async () => "boar")
  })

  afterEach(() => {
    sandbox.restore()
  })

  it("routes alchemy_ methods to a capability-declaring endpoint ahead of Boar", async () => {
    const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => plainProvider },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: () => alchemyProvider,
      },
      { type: "boar", creator: () => boarProvider },
    ])

    await expect(
      fallbackProvider.send("alchemy_getTokenBalances", []),
    ).resolves.toEqual("alchemy")

    expect(
      callsFor(alchemySendStub, "alchemy_getTokenBalances").length,
    ).toEqual(1)
    expect(callsFor(boarSendStub, "alchemy_getTokenBalances").length).toEqual(0)
    expect(callsFor(plainSendStub, "alchemy_getTokenBalances").length).toEqual(
      0,
    )
  })

  it("still routes standard methods through the ordinary generic walk", async () => {
    const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => plainProvider },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: () => alchemyProvider,
      },
    ])

    await expect(fallbackProvider.send("eth_getBalance", [])).resolves.toEqual(
      "plain",
    )

    expect(callsFor(plainSendStub, "eth_getBalance").length).toEqual(1)
    expect(callsFor(alchemySendStub, "eth_getBalance").length).toEqual(0)
  })

  it("fails over between capability-declaring endpoints", async () => {
    const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => plainProvider },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: () => alchemyProvider,
      },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: () => secondAlchemyProvider,
      },
    ])

    alchemySendStub
      .withArgs("alchemy_getAssetTransfers")
      .throws(new Error("some strange failure"))

    await expect(
      fallbackProvider.send("alchemy_getAssetTransfers", []),
    ).resolves.toEqual("alchemy-2")

    expect(
      callsFor(alchemySendStub, "alchemy_getAssetTransfers").length,
    ).toEqual(1)
    expect(
      callsFor(secondAlchemySendStub, "alchemy_getAssetTransfers").length,
    ).toEqual(1)
  })

  it("falls back to Boar when capability endpoints are exhausted", async () => {
    const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => plainProvider },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: () => alchemyProvider,
      },
      { type: "boar", creator: () => boarProvider },
    ])

    alchemySendStub
      .withArgs("alchemy_getTokenMetadata")
      .throws(new Error("some strange failure"))

    await expect(
      fallbackProvider.send("alchemy_getTokenMetadata", []),
    ).resolves.toEqual("boar")

    expect(
      callsFor(alchemySendStub, "alchemy_getTokenMetadata").length,
    ).toEqual(1)
    expect(callsFor(boarSendStub, "alchemy_getTokenMetadata").length).toEqual(1)
  })

  it("rejects when capability endpoints are exhausted and there is no Boar", async () => {
    const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
      { type: "generic", creator: () => plainProvider },
      {
        type: "generic",
        capabilities: ["alchemy_"],
        creator: () => alchemyProvider,
      },
    ])

    const error = new Error("some strange failure")
    alchemySendStub.withArgs("alchemy_getTokenBalances").throws(error)

    await expect(
      fallbackProvider.send("alchemy_getTokenBalances", []),
    ).rejects.toEqual(error)

    expect(callsFor(plainSendStub, "alchemy_getTokenBalances").length).toEqual(
      0,
    )
  })

  describe("supportsAlchemy", () => {
    it("is true when an endpoint declares the alchemy_ capability", () => {
      const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
        {
          type: "generic",
          capabilities: ["alchemy_"],
          creator: () => alchemyProvider,
        },
      ])

      expect(fallbackProvider.supportsAlchemy).toBe(true)
      expect(fallbackProvider.supportsBoar).toBe(false)
    })

    it("is true when Boar is available", () => {
      const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
        { type: "generic", creator: () => plainProvider },
        { type: "boar", creator: () => boarProvider },
      ])

      expect(fallbackProvider.supportsAlchemy).toBe(true)
    })

    it("is false without Boar or a capability-declaring endpoint", () => {
      const fallbackProvider = new SerialFallbackProvider(ETHEREUM.chainID, [
        { type: "generic", creator: () => plainProvider },
      ])

      expect(fallbackProvider.supportsAlchemy).toBe(false)
    })
  })
})
