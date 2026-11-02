import { getAddress, hexZeroPad } from "ethers/lib/utils"
import NameService from ".."
import type ChainService from "../../chain"
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../constants"
import { createPreferenceService } from "../../../tests/factories"

const MAINNET_ADDRESS = getAddress("0x52ec2f3d7c5977a8e558c8d9c6000b615098e8fc")
const OTHER_ADDRESS = getAddress("0xabcdef0123456789abcdef0123456789abcdef01")

/**
 * Creates a NameService whose only chain interaction is a fake mainnet ENS
 * provider. `recordsByCoinType` keys are coin types as hex strings.
 */
async function createNameServiceWithENS({
  mainnetAddress,
  recordsByCoinType,
  fetchBytesError,
}: {
  mainnetAddress: string | null
  recordsByCoinType: Record<string, string | null>
  fetchBytesError?: Error
}): Promise<NameService> {
  const resolver = {
    _fetchBytes: async (_selector: string, parameters?: string) => {
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
    resolveName: async () => mainnetAddress,
    getResolver: async () => resolver,
  }

  const chainService = {
    providerForNetwork: () => provider,
    emitter: { on: () => undefined },
  } as unknown as ChainService

  return NameService.create(
    Promise.resolve(chainService),
    createPreferenceService(),
  )
}

describe("NameService.isNameOwnershipCompatible", () => {
  it("is true when ENS names the same address on both networks", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: { "0x80000089": MAINNET_ADDRESS },
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "vitalik.eth", network: ETHEREUM },
        POLYGON,
      ),
    ).toBe(true)
  })

  it("is true when comparing two L2 networks with the same address", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: null,
      recordsByCoinType: {
        "0x80000089": OTHER_ADDRESS,
        "0x8000000a": OTHER_ADDRESS,
      },
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "vitalik.eth", network: POLYGON },
        OPTIMISM,
      ),
    ).toBe(true)
  })

  it("is false when the networks name different addresses", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: { "0x80000089": OTHER_ADDRESS },
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "vitalik.eth", network: ETHEREUM },
        POLYGON,
      ),
    ).toBe(false)
  })

  it("is false when the other network has no record", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: {},
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "vitalik.eth", network: ETHEREUM },
        POLYGON,
      ),
    ).toBe(false)
  })

  it("is false when the name does not resolve on the origin network", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: null,
      recordsByCoinType: { "0x80000089": MAINNET_ADDRESS },
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "vitalik.eth", network: ETHEREUM },
        POLYGON,
      ),
    ).toBe(false)
  })

  it("is false when a lookup throws", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: {},
      fetchBytesError: new Error("network down"),
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "vitalik.eth", network: ETHEREUM },
        POLYGON,
      ),
    ).toBe(false)
  })

  it("is false for names outside ENS", async () => {
    const nameService = await createNameServiceWithENS({
      mainnetAddress: MAINNET_ADDRESS,
      recordsByCoinType: { "0x80000089": MAINNET_ADDRESS },
    })

    expect(
      await nameService.isNameOwnershipCompatible(
        { name: "example.crypto", network: ETHEREUM },
        POLYGON,
      ),
    ).toBe(false)
  })
})
