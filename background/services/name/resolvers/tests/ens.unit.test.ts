import { getAddress, hexZeroPad } from "ethers/lib/utils"
import ensResolverFor, { ensCoinTypeForChainID } from "../ens"
import type ChainService from "../../../chain"
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../../constants"
import type { EVMNetwork } from "../../../../networks"

const MAINNET_ADDRESS = getAddress("0x52ec2f3d7c5977a8e558c8d9c6000b615098e8fc")
const L2_ADDRESS = getAddress("0xabcdef0123456789abcdef0123456789abcdef01")

type FakeChainServiceOptions = {
  mainnetAddress?: string | null
  recordsByCoinType?: Record<string, string | null>
  hasResolver?: boolean
  fetchBytesError?: Error
}

/**
 * A chain service whose only provider is a fake mainnet ENS provider. The
 * `recordsByCoinType` keys are coin types as hex strings, e.g. "0x80000089".
 */
function createFakeChainService({
  mainnetAddress = null,
  recordsByCoinType = {},
  hasResolver = true,
  fetchBytesError,
}: FakeChainServiceOptions = {}) {
  const resolveNameCalls: string[] = []
  const getResolverCalls: string[] = []
  const fetchBytesCalls: { selector: string; parameters?: string }[] = []

  const resolver = {
    _fetchBytes: async (selector: string, parameters?: string) => {
      fetchBytesCalls.push({ selector, parameters })
      if (fetchBytesError !== undefined) {
        throw fetchBytesError
      }
      const match = Object.entries(recordsByCoinType).find(
        ([coinType]) => hexZeroPad(coinType, 32) === parameters,
      )
      return match?.[1] ?? null
    },
  }

  const provider = {
    resolveName: async (name: string) => {
      resolveNameCalls.push(name)
      return mainnetAddress
    },
    getResolver: async (name: string) => {
      getResolverCalls.push(name)
      return hasResolver ? resolver : null
    },
  }

  const chainService = {
    providerForNetwork: () => provider,
    emitter: { on: () => undefined },
  } as unknown as ChainService

  return {
    chainService,
    resolveNameCalls,
    getResolverCalls,
    fetchBytesCalls,
  }
}

describe("ensCoinTypeForChainID", () => {
  it("uses SLIP-44 coin type 60 for Ethereum mainnet", () => {
    expect(ensCoinTypeForChainID("1")).toEqual(60)
  })

  it("uses the ENSIP-11 coin type for other EVM chains", () => {
    expect(ensCoinTypeForChainID("137")).toEqual(0x80000089)
    expect(ensCoinTypeForChainID("10")).toEqual(0x8000000a)
  })
})

describe("ENS resolver lookUpAddressForName", () => {
  it("resolves mainnet names with resolveName", async () => {
    const fake = createFakeChainService({ mainnetAddress: MAINNET_ADDRESS })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "vitalik.eth",
      network: ETHEREUM,
    })

    expect(result).toEqual({ address: MAINNET_ADDRESS, network: ETHEREUM })
    expect(fake.resolveNameCalls).toEqual(["vitalik.eth"])
    expect(fake.getResolverCalls).toEqual([])
  })

  it("returns undefined for mainnet names that do not resolve", async () => {
    const fake = createFakeChainService({ mainnetAddress: null })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "unknown.eth",
      network: ETHEREUM,
    })

    expect(result).toBeUndefined()
  })

  it("resolves an L2 record from mainnet ENS under the ENSIP-11 coin type", async () => {
    const fake = createFakeChainService({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: { "0x80000089": L2_ADDRESS },
    })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "vitalik.eth",
      network: POLYGON,
    })

    expect(result).toEqual({ address: L2_ADDRESS, network: POLYGON })
    expect(fake.resolveNameCalls).toEqual([])
    expect(fake.fetchBytesCalls).toEqual([
      {
        selector: "0xf1cb7e06",
        parameters: hexZeroPad("0x80000089", 32),
      },
    ])
  })

  it("returns undefined when the L2 record is unset", async () => {
    const fake = createFakeChainService({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: { "0x8000000a": null },
    })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "vitalik.eth",
      network: OPTIMISM,
    })

    expect(result).toBeUndefined()
  })

  it("returns undefined when the L2 record is empty bytes", async () => {
    const fake = createFakeChainService({
      recordsByCoinType: { "0x8000000a": "0x" },
    })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "vitalik.eth",
      network: OPTIMISM,
    })

    expect(result).toBeUndefined()
  })

  it("returns undefined when the L2 record is not 20 bytes", async () => {
    const fake = createFakeChainService({
      recordsByCoinType: { "0x8000000a": hexZeroPad(L2_ADDRESS, 32) },
    })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "vitalik.eth",
      network: OPTIMISM,
    })

    expect(result).toBeUndefined()
  })

  it("returns undefined when the name has no resolver", async () => {
    const fake = createFakeChainService({
      hasResolver: false,
      recordsByCoinType: { "0x8000000a": L2_ADDRESS },
    })
    const resolver = ensResolverFor(fake.chainService)

    const result = await resolver.lookUpAddressForName({
      name: "vitalik.eth",
      network: OPTIMISM,
    })

    expect(result).toBeUndefined()
    expect(fake.fetchBytesCalls).toEqual([])
  })

  it("flags its records as spanning networks", () => {
    const fake = createFakeChainService()
    const resolver = ensResolverFor(fake.chainService)

    expect(resolver.recordOwnershipSpansNetworks).toBe(true)
  })

  it("does not claim names on networks outside the ENS supported list", () => {
    const fake = createFakeChainService()
    const resolver = ensResolverFor(fake.chainService)
    const unsupported = { ...POLYGON, chainID: "999999" } as EVMNetwork

    expect(
      resolver.canAttemptAddressResolution({
        name: "vitalik.eth",
        network: unsupported,
      }),
    ).toBe(false)
  })
})
