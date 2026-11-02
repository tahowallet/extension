import NameService from ".."
import type ChainService from "../../chain"
import type { AddressOnNetwork } from "../../../accounts"
import { ETHEREUM, OPTIMISM, POLYGON } from "../../../constants"
import { normalizeEVMAddress } from "../../../lib/utils"
import { createPreferenceService } from "../../../tests/factories"

const ADDRESS = normalizeEVMAddress(
  "0x1234567890abcdef1234567890abcdef12345678",
)
const OTHER_ADDRESS = normalizeEVMAddress(
  "0xabcdef0123456789abcdef0123456789abcdef01",
)

/**
 * A NameService whose chain service tracks `trackedAccounts` and offers no
 * providers, so only the local resolvers can answer.
 */
async function createNameService(
  trackedAccounts: AddressOnNetwork[] = [],
): Promise<NameService> {
  const chainService = {
    providerForNetwork: () => undefined,
    getAccountsToTrack: async () => trackedAccounts,
    emitter: { on: () => undefined },
  } as unknown as ChainService

  const nameService = await NameService.create(
    Promise.resolve(chainService),
    createPreferenceService(),
  )
  await nameService.startService()
  return nameService
}

describe("NameService address book", () => {
  it("saves entries and resolves them in both directions", async () => {
    const nameService = await createNameService()

    expect(
      await nameService.addOrEditAddressBookEntry({
        address: ADDRESS,
        network: ETHEREUM,
        name: "  Brother ",
      }),
    ).toEqual({ success: true })

    expect(
      (await nameService.lookUpName({ address: ADDRESS, network: ETHEREUM }))
        ?.resolved.nameOnNetwork.name,
    ).toEqual("Brother")
    expect(
      (
        await nameService.lookUpEthereumAddress({
          name: "brother",
          network: ETHEREUM,
        })
      )?.resolved.addressOnNetwork.address,
    ).toEqual(ADDRESS)
  })

  it("persists entries across service instances", async () => {
    const nameService = await createNameService()
    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Brother",
    })
    await nameService.stopService()

    const restarted = await createNameService()
    expect(restarted.getAddressBook()).toEqual([
      expect.objectContaining({
        address: ADDRESS,
        name: "Brother",
        network: ETHEREUM,
      }),
    ])
  })

  it("emits the full address book when it changes", async () => {
    const nameService = await createNameService()
    const emitted: unknown[] = []
    nameService.emitter.on("addressBook", (entries) => {
      emitted.push(entries)
    })

    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Brother",
    })
    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Sister",
    })

    expect(emitted.at(-1)).toEqual([
      expect.objectContaining({ address: ADDRESS, name: "Sister" }),
    ])
  })

  it("rejects empty names", async () => {
    const nameService = await createNameService()

    expect(
      await nameService.addOrEditAddressBookEntry({
        address: ADDRESS,
        network: ETHEREUM,
        name: "   ",
      }),
    ).toEqual({ success: false, error: "empty-name" })
    expect(nameService.getAddressBook()).toEqual([])
  })

  it("rejects a name another address uses on the same network", async () => {
    const nameService = await createNameService()
    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Brother",
    })

    expect(
      await nameService.addOrEditAddressBookEntry({
        address: OTHER_ADDRESS,
        network: ETHEREUM,
        name: "BROTHER",
      }),
    ).toEqual({ success: false, error: "duplicate-name" })
    expect(
      await nameService.addOrEditAddressBookEntry({
        address: OTHER_ADDRESS,
        network: POLYGON,
        name: "Brother",
      }),
    ).toEqual({ success: true })
  })

  it("only applies an entry on other networks it's control-compatible with", async () => {
    const nameService = await createNameService()
    nameService.setAddressControlCompatibilityCheck(
      async ({ network }, otherNetwork) =>
        network.chainID === ETHEREUM.chainID &&
        otherNetwork.chainID === POLYGON.chainID,
    )
    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Brother",
    })

    expect(
      await nameService.lookUpAddressBookName({
        address: ADDRESS,
        network: POLYGON,
      }),
    ).toEqual({ name: "Brother", network: POLYGON })
    expect(
      await nameService.lookUpAddressBookName({
        address: ADDRESS,
        network: OPTIMISM,
      }),
    ).toBeUndefined()
    expect(
      await nameService.lookUpAddressBookAddress({
        name: "Brother",
        network: POLYGON,
      }),
    ).toEqual({ address: ADDRESS, network: POLYGON })
  })

  it("prefers an entry saved on the network over one that applies to it", async () => {
    const nameService = await createNameService()
    nameService.setAddressControlCompatibilityCheck(async () => true)
    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: POLYGON,
      name: "Polygon name",
    })
    await nameService.addOrEditAddressBookEntry({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Ethereum name",
    })

    expect(
      await nameService.lookUpAddressBookName({
        address: ADDRESS,
        network: POLYGON,
      }),
    ).toEqual({ name: "Polygon name", network: POLYGON })
    // Neither is saved on Optimism, so the most recently updated one wins.
    expect(
      await nameService.lookUpAddressBookName({
        address: ADDRESS,
        network: OPTIMISM,
      }),
    ).toEqual({ name: "Ethereum name", network: OPTIMISM })
  })

  it("renames tracked accounts on save and clears the name on removal", async () => {
    const tracked = { address: ADDRESS, network: ETHEREUM }
    const nameService = await createNameService([tracked])
    const resolvedNames: string[] = []
    const clearedNames: AddressOnNetwork[] = []
    nameService.emitter.on("resolvedName", ({ resolved }) => {
      resolvedNames.push(resolved.nameOnNetwork.name)
    })
    nameService.emitter.on("clearedName", (addressOnNetwork) => {
      clearedNames.push(addressOnNetwork)
    })

    await nameService.addOrEditAddressBookEntry({ ...tracked, name: "Mine" })
    expect(resolvedNames).toEqual(["Mine"])

    await nameService.removeAddressBookEntry(tracked)
    expect(nameService.getAddressBook()).toEqual([])
    expect(clearedNames).toEqual([tracked])
  })
})
