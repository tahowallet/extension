import type { HexString, NormalizedEVMAddress, UNIXTime } from "../../types"
import {
  normalizeAddressOnNetwork,
  normalizeEVMAddress,
  sameEVMAddress,
} from "../../lib/utils"
import { getTokenMetadata } from "../../lib/erc721"
import { storageGatewayURL } from "../../lib/storage-gateway"

import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import ChainService from "../chain"
import logger from "../../lib/logger"
import type { AddressOnNetwork, NameOnNetwork } from "../../accounts"
import { sameNetwork, type EVMNetwork } from "../../networks"
import { SECOND } from "../../constants"

import { NameResolver } from "./name-resolver"
import type { NameResolverSystem } from "./resolvers"
import {
  knownContractResolverFor,
  addressBookResolverFor,
  ensResolverFor,
  unsResolver,
  rnsResolver,
  mezoResolver,
} from "./resolvers"
import PreferenceService from "../preferences"
import { isFulfilledPromise } from "../../lib/utils/type-guards"
import { wrapIfEnabled } from "../../features"
import { AddressBookEntry, NameDatabase, getOrCreateDB } from "./db"

export type { NameResolverSystem, AddressBookEntry }

/**
 * Answers whether an address saved on one network is known to be controlled by
 * the same party on another. Provided by the signing service, which the name
 * service can't depend on directly since it depends on the name service. See
 * RFB 5.
 */
export type AddressControlCompatibilityCheck = (
  addressOnNetwork: AddressOnNetwork,
  otherNetwork: EVMNetwork,
) => Promise<boolean>

export type AddressBookUpdateResult =
  | { success: true }
  | { success: false; error: "empty-name" | "duplicate-name" }

/**
 * Names are compared ignoring case and surrounding whitespace, so that two
 * entries can't look the same to the user while resolving differently.
 */
const comparableName = (name: string) => name.trim().toLowerCase()

/**
 * The chain IDs an entry was explicitly saved for: the network it's saved on,
 * and any the user added.
 */
const explicitChainIDs = ({
  network,
  additionalChainIDs,
}: Pick<AddressBookEntry, "network" | "additionalChainIDs">) =>
  new Set([network.chainID, ...additionalChainIDs])

export type ResolvedAddressRecord = {
  from: NameOnNetwork
  resolved: {
    addressOnNetwork: AddressOnNetwork
  }
  system: NameResolverSystem
}

export type ResolvedNameRecord = {
  from: {
    addressOnNetwork: AddressOnNetwork
  }
  resolved: {
    nameOnNetwork: NameOnNetwork
    expiresAt: UNIXTime
  }
  system: NameResolverSystem
}

type ResolvedAvatarRecord = {
  from: {
    addressOnNetwork: AddressOnNetwork
  }
  resolved: {
    avatar: URL
  }
  system: NameResolverSystem
}

type Events = ServiceLifecycleEvents & {
  resolvedAddress: ResolvedAddressRecord
  resolvedName: ResolvedNameRecord
  resolvedAvatar: ResolvedAvatarRecord
  /**
   * Emitted when a name that previously applied to an address on a network
   * no longer does, e.g. after an address book entry is removed.
   */
  clearedName: AddressOnNetwork
  /** The full address book, emitted on startup and after every change. */
  addressBook: AddressBookEntry[]
}

// A minimum record expiry that avoids infinite resolution loops.
const MINIMUM_RECORD_EXPIRY = 10 * SECOND

/**
 * The NameService is responsible for resolving human-readable names into
 * addresses and other metadata across multiple networks, caching where
 * appropriate.
 *
 * Initially, the service supports ENS on mainnet Ethereum.
 */
export default class NameService extends BaseService<Events> {
  private resolvers: NameResolver<NameResolverSystem>[] = []

  /**
   * In-memory copy of the persisted address book, so lookups don't need to hit
   * the database.
   */
  private addressBook: AddressBookEntry[] = []

  /**
   * Until the signing service provides a real check, an entry only applies on
   * the network it was saved on.
   */
  private isAddressControlCompatible: AddressControlCompatibilityCheck = async (
    addressOnNetwork,
    otherNetwork,
  ) => sameNetwork(addressOnNetwork.network, otherNetwork)

  /**
   * Cached resolution for avatar URIs that are not yet URLs, e.g. for EIP155.
   */
  private cachedResolvedEIP155Avatars: Record<
    string,
    ResolvedAvatarRecord | undefined
  > = {}

  /**
   * Cached resolution for name records, by network family followed by whatever
   * discrimant might be used within a network family between networks.
   */
  private cachedResolvedNames: {
    EVM: {
      [chainID: string]: {
        [address: HexString]: ResolvedNameRecord | undefined
      }
    }
  } = {
    EVM: {},
  }

  /**
   * Create a new NameService. The service isn't initialized until
   * startService() is called and resolved.
   *
   * @param chainService - Required for chain interactions.
   * @returns A new, initializing ChainService
   */
  static create: ServiceCreatorFunction<
    Events,
    NameService,
    [Promise<ChainService>, Promise<PreferenceService>]
  > = async (chainService, preferenceService) =>
    new this(await chainService, await preferenceService, await getOrCreateDB())

  private constructor(
    private chainService: ChainService,
    preferenceService: PreferenceService,
    private db: NameDatabase,
  ) {
    super({})

    this.resolvers = [
      // User-controlled resolvers are higher priority.
      addressBookResolverFor(this),
      knownContractResolverFor(preferenceService),
      // Third-party resolvers are used when the user has not defined a name
      // for the given resource.
      ensResolverFor(chainService),
      unsResolver(),
      rnsResolver(),
      ...wrapIfEnabled("SUPPORT_MEZO_NETWORK", mezoResolver()),
    ]

    chainService.emitter.on("newAccountToTrack", async (addressOnNetwork) => {
      try {
        await this.lookUpName(addressOnNetwork)
      } catch (error) {
        logger.error("Error fetching name for address", addressOnNetwork, error)
      }
    })
    this.emitter.on("resolvedName", async ({ from: { addressOnNetwork } }) => {
      try {
        const avatar = await this.lookUpAvatar(addressOnNetwork)

        if (avatar) {
          this.emitter.emit("resolvedAvatar", avatar)
        }
      } catch (error) {
        logger.error(
          "Error fetching avatar for address",
          addressOnNetwork,
          error,
        )
      }
    })
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.addressBook = await this.db.getAddressBook()
    this.emitter.emit("addressBook", this.addressBook)
  }

  /**
   * Sets how the name service decides whether an address book entry saved on
   * one network applies on another. See {@link AddressControlCompatibilityCheck}.
   */
  setAddressControlCompatibilityCheck(
    check: AddressControlCompatibilityCheck,
  ): void {
    this.isAddressControlCompatible = check
  }

  getAddressBook(): AddressBookEntry[] {
    return this.addressBook
  }

  /**
   * Saves a name for an address on a network, and optionally on other
   * networks the user chooses, replacing any name already saved for that
   * address on that network. With `previousNetwork`, the entry saved there
   * is moved to `network`.
   *
   * A name can't be saved if another address already uses it on one of the
   * same networks, since looking the name up there would be ambiguous.
   */
  async addOrEditAddressBookEntry({
    address,
    network,
    name,
    additionalChainIDs = [],
    previousNetwork,
  }: AddressOnNetwork & {
    name: string
    additionalChainIDs?: string[]
    previousNetwork?: EVMNetwork
  }): Promise<AddressBookUpdateResult> {
    const trimmedName = name.trim()
    if (trimmedName === "") {
      return { success: false, error: "empty-name" }
    }

    const normalizedAddress = normalizeEVMAddress(address)
    const additional = [...new Set(additionalChainIDs)].filter(
      (chainID) => chainID !== network.chainID,
    )
    const chainIDs = explicitChainIDs({
      network,
      additionalChainIDs: additional,
    })

    const nameIsTaken = this.addressBook.some(
      (entry) =>
        !sameEVMAddress(entry.address, normalizedAddress) &&
        comparableName(entry.name) === comparableName(trimmedName) &&
        [...explicitChainIDs(entry)].some((chainID) => chainIDs.has(chainID)),
    )
    if (nameIsTaken) {
      return { success: false, error: "duplicate-name" }
    }

    const isEntryFor =
      (entryNetwork: EVMNetwork) => (entry: AddressBookEntry) =>
        sameNetwork(entry.network, entryNetwork) &&
        sameEVMAddress(entry.address, normalizedAddress)
    const existingEntry =
      this.addressBook.find(isEntryFor(network)) ??
      (previousNetwork === undefined
        ? undefined
        : this.addressBook.find(isEntryFor(previousNetwork)))
    const replacedEntries = this.addressBook.filter(
      (entry) =>
        isEntryFor(network)(entry) ||
        (previousNetwork !== undefined && isEntryFor(previousNetwork)(entry)),
    )

    const now = Date.now()
    const entry: AddressBookEntry = {
      address: normalizedAddress,
      network,
      name: trimmedName,
      additionalChainIDs: additional,
      createdAt: existingEntry?.createdAt ?? now,
      updatedAt: now,
    }

    if (
      previousNetwork !== undefined &&
      !sameNetwork(previousNetwork, network)
    ) {
      await this.db.deleteAddressBookEntry(
        normalizedAddress,
        previousNetwork.chainID,
      )
    }
    await this.db.putAddressBookEntry(entry)
    this.addressBook = [
      ...this.addressBook.filter((other) => !replacedEntries.includes(other)),
      entry,
    ]
    this.emitter.emit("addressBook", this.addressBook)

    await this.refreshNamesForAddress(normalizedAddress)

    return { success: true }
  }

  async removeAddressBookEntry({
    address,
    network,
  }: AddressOnNetwork): Promise<void> {
    const normalizedAddress = normalizeEVMAddress(address)

    await this.db.deleteAddressBookEntry(normalizedAddress, network.chainID)
    this.addressBook = this.addressBook.filter(
      (entry) =>
        !(
          sameNetwork(entry.network, network) &&
          sameEVMAddress(entry.address, normalizedAddress)
        ),
    )
    this.emitter.emit("addressBook", this.addressBook)

    await this.refreshNamesForAddress(normalizedAddress)
  }

  /**
   * Re-resolves names for every tracked account that has an address book
   * entry, for use when the conditions deciding which networks an entry
   * applies on may have changed, e.g. when control compatibility changes.
   */
  async refreshAddressBookNames(): Promise<void> {
    const addresses = new Set(this.addressBook.map(({ address }) => address))

    await Promise.all(
      [...addresses].map((address) => this.refreshNamesForAddress(address)),
    )
  }

  /**
   * Returns the address book entry that applies to an address on a network: an
   * entry saved on that network if there is one, then the most recently
   * updated entry the user applied to that network, and otherwise the most
   * recently updated entry saved on a network the address is known to be
   * control-compatible with.
   */
  async lookUpAddressBookName({
    address,
    network,
  }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
    const entry = await this.findApplicableEntry(network, (candidate) =>
      sameEVMAddress(candidate.address, address),
    )

    return entry === undefined ? undefined : { name: entry.name, network }
  }

  /**
   * Returns the address an address book name refers to on a network, using
   * the same rules as {@link lookUpAddressBookName}.
   */
  async lookUpAddressBookAddress({
    name,
    network,
  }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
    const entry = await this.findApplicableEntry(
      network,
      (candidate) => comparableName(candidate.name) === comparableName(name),
    )

    return entry === undefined ? undefined : { address: entry.address, network }
  }

  private async findApplicableEntry(
    network: EVMNetwork,
    matches: (entry: AddressBookEntry) => boolean,
  ): Promise<AddressBookEntry | undefined> {
    const candidates = this.addressBook.filter(matches)

    const onNetwork = candidates.find((entry) =>
      sameNetwork(entry.network, network),
    )
    if (onNetwork !== undefined) {
      return onNetwork
    }

    // Entries are kept in write order, so reversing before a stable sort makes
    // the latest write win when timestamps tie.
    const onOtherNetworks = [...candidates]
      .reverse()
      .sort((a, b) => b.updatedAt - a.updatedAt)

    const appliedByUser = onOtherNetworks.find((entry) =>
      entry.additionalChainIDs.includes(network.chainID),
    )
    if (appliedByUser !== undefined) {
      return appliedByUser
    }

    const compatibilities = await Promise.all(
      onOtherNetworks.map(async (entry) => {
        try {
          return await this.isAddressControlCompatible(entry, network)
        } catch (error) {
          return false
        }
      }),
    )

    // Most recently updated first, so the latest applicable entry wins.
    return onOtherNetworks.find((_, index) => compatibilities[index])
  }

  /**
   * Re-resolves the name of an address on every network it's tracked on,
   * emitting `clearedName` where no name applies anymore.
   */
  private async refreshNamesForAddress(
    address: NormalizedEVMAddress,
  ): Promise<void> {
    const trackedAccounts = await this.chainService.getAccountsToTrack()

    await Promise.all(
      trackedAccounts
        .filter((account) => sameEVMAddress(account.address, address))
        .map(async (account) => {
          this.clearNameCacheEntry(account.network.chainID, address)
          try {
            const record = await this.lookUpName(account, false)
            if (record === undefined) {
              this.emitter.emit("clearedName", account)
            }
          } catch (error) {
            logger.error("Error refreshing name for address", account, error)
          }
        }),
    )
  }

  /**
   * Returns true if the name resolves to the same address on both networks
   * through a name system whose records share an owner across networks, which
   * is currently only ENS. This is the name service condition for control
   * compatibility; see RFB 5.
   */
  async isNameOwnershipCompatible(
    nameOnNetwork: NameOnNetwork,
    otherNetwork: EVMNetwork,
  ): Promise<boolean> {
    const otherNameOnNetwork: NameOnNetwork = {
      name: nameOnNetwork.name,
      network: otherNetwork,
    }

    const ownershipSpanningResolvers = this.resolvers.filter(
      (resolver) =>
        resolver.recordOwnershipSpansNetworks === true &&
        resolver.canAttemptAddressResolution(nameOnNetwork) &&
        resolver.canAttemptAddressResolution(otherNameOnNetwork),
    )

    const compatibilities = await Promise.all(
      ownershipSpanningResolvers.map(async (resolver) => {
        const [resolvedOnNetwork, resolvedOnOtherNetwork] = await Promise.all(
          [nameOnNetwork, otherNameOnNetwork].map(async (name) => {
            try {
              return await resolver.lookUpAddressForName(name)
            } catch (error) {
              return undefined
            }
          }),
        )

        return (
          resolvedOnNetwork !== undefined &&
          resolvedOnOtherNetwork !== undefined &&
          sameEVMAddress(
            resolvedOnNetwork.address,
            resolvedOnOtherNetwork.address,
          )
        )
      }),
    )

    return compatibilities.some((compatible) => compatible)
  }

  async lookUpEthereumAddress(
    nameOnNetwork: NameOnNetwork,
  ): Promise<ResolvedAddressRecord | undefined> {
    const workingResolvers = this.resolvers.filter((resolver) =>
      resolver.canAttemptAddressResolution(nameOnNetwork),
    )

    const firstMatchingResolution = (
      await Promise.allSettled(
        workingResolvers.map(async (resolver) => ({
          type: resolver.type,
          resolved: await resolver.lookUpAddressForName(nameOnNetwork),
        })),
      )
    )
      .filter(isFulfilledPromise)
      .find(({ value: { resolved } }) => resolved !== undefined)?.value

    if (
      firstMatchingResolution === undefined ||
      firstMatchingResolution.resolved === undefined
    ) {
      return undefined
    }

    const { type: resolverType, resolved: addressOnNetwork } =
      firstMatchingResolution

    // TODO cache name resolution and TTL
    const normalizedAddressOnNetwork =
      normalizeAddressOnNetwork(addressOnNetwork)

    const resolvedRecord = {
      from: nameOnNetwork,
      resolved: { addressOnNetwork: normalizedAddressOnNetwork },
      system: resolverType,
    }
    this.emitter.emit("resolvedAddress", resolvedRecord)

    return resolvedRecord
  }

  async lookUpName(
    addressOnNetwork: AddressOnNetwork,
    checkCache = true,
  ): Promise<ResolvedNameRecord | undefined> {
    const { address, network } = normalizeAddressOnNetwork(addressOnNetwork)

    if (!this.cachedResolvedNames[network.family][network.chainID]) {
      this.cachedResolvedNames[network.family][network.chainID] = {}
    }

    const cachedResolvedNameRecord =
      this.cachedResolvedNames[network.family]?.[network.chainID]?.[address]

    if (checkCache && cachedResolvedNameRecord) {
      const {
        resolved: { expiresAt },
      } = cachedResolvedNameRecord

      if (expiresAt >= Date.now()) {
        return cachedResolvedNameRecord
      }
    }

    const workingResolvers = this.resolvers.filter((resolver) =>
      resolver.canAttemptNameResolution({ address, network }),
    )

    const localResolvers = [...workingResolvers].filter(
      (resolver) =>
        resolver.type === "tally-address-book" ||
        resolver.type === "tally-known-contracts",
    )
    const remoteResolvers = [...workingResolvers].filter(
      (resolver) =>
        resolver.type !== "tally-address-book" &&
        resolver.type !== "tally-known-contracts",
    )

    let firstMatchingResolution = (
      await Promise.allSettled(
        localResolvers.map(async (resolver) => ({
          type: resolver.type,
          resolved: await resolver.lookUpNameForAddress({ address, network }),
        })),
      )
    )
      .filter(isFulfilledPromise)
      .find(({ value: { resolved } }) => resolved !== undefined)?.value

    if (!firstMatchingResolution) {
      firstMatchingResolution = (
        await Promise.allSettled(
          remoteResolvers.map(async (resolver) => ({
            type: resolver.type,
            resolved: await resolver.lookUpNameForAddress({ address, network }),
          })),
        )
      )
        .filter(isFulfilledPromise)
        .find(({ value: { resolved } }) => resolved !== undefined)?.value
    }

    if (
      firstMatchingResolution === undefined ||
      firstMatchingResolution.resolved === undefined
    ) {
      return undefined
    }

    const { type: resolverType, resolved: nameOnNetwork } =
      firstMatchingResolution

    const nameRecord = {
      from: { addressOnNetwork: { address, network } },
      resolved: {
        nameOnNetwork,
        // TODO Read this from the name service; for now, this avoids infinite
        // TODO resolution loops.
        expiresAt: Date.now() + MINIMUM_RECORD_EXPIRY,
      },
      system: resolverType,
    } as const

    const cachedNameOnNetwork = cachedResolvedNameRecord?.resolved.nameOnNetwork

    this.cachedResolvedNames[network.family][network.chainID][address] =
      nameRecord

    // Only emit an event if the resolved name changed.
    if (cachedNameOnNetwork?.name !== nameOnNetwork.name) {
      this.emitter.emit("resolvedName", nameRecord)
    }

    return nameRecord
  }

  clearNameCacheEntry(chainId: string, address: HexString): void {
    if (this.cachedResolvedNames.EVM[chainId]?.[address] !== undefined) {
      delete this.cachedResolvedNames.EVM[chainId][address]
    }
  }

  removeAccount(address: HexString): void {
    const chainIds = Object.keys(this.cachedResolvedNames.EVM)

    chainIds.forEach((chainId) => {
      this.clearNameCacheEntry(chainId, address)
    })
  }

  async lookUpAvatar(
    addressOnNetwork: AddressOnNetwork,
  ): Promise<ResolvedAvatarRecord | undefined> {
    const workingResolvers = this.resolvers.filter((resolver) =>
      resolver.canAttemptAvatarResolution(addressOnNetwork),
    )

    const firstMatchingResolution = (
      await Promise.allSettled(
        workingResolvers.map(async (resolver) => ({
          type: resolver.type,
          resolved: await resolver.lookUpAvatar(addressOnNetwork),
        })),
      )
    )
      .filter(isFulfilledPromise)
      .find(({ value: { resolved } }) => resolved !== undefined)?.value

    if (
      firstMatchingResolution === undefined ||
      firstMatchingResolution.resolved === undefined
    ) {
      return undefined
    }

    const {
      type: resolverType,
      resolved: { uri: avatarUri },
    } = firstMatchingResolution

    const baseResolvedAvatar = {
      from: { addressOnNetwork },
      system: resolverType,
    }

    if (avatarUri instanceof URL) {
      return {
        ...baseResolvedAvatar,
        resolved: { avatar: storageGatewayURL(avatarUri.href) },
      }
    }

    if (avatarUri.match(/^eip155:1\/erc721:/)) {
      const normalizedAvatarUri = avatarUri.toLowerCase()
      // check if we've cached the resolved URL, otherwise hit the chain
      if (normalizedAvatarUri in this.cachedResolvedEIP155Avatars) {
        // TODO properly cache this with any other non-ENS NFT stuff we do
        return this.cachedResolvedEIP155Avatars[normalizedAvatarUri]
      }

      const provider = this.chainService.providerForNetwork(
        addressOnNetwork.network,
      )

      // these URIs look like eip155:1/erc721:0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6/2430
      // check the spec for more details https://gist.github.com/Arachnid/9db60bd75277969ee1689c8742b75182
      const [, , , erc721Address, nftID] = avatarUri.split(/[:/]/)
      if (
        provider !== undefined &&
        erc721Address !== undefined &&
        nftID !== undefined
      ) {
        const metadata = await getTokenMetadata(
          provider,
          erc721Address,
          BigInt(nftID),
        )

        if (metadata !== undefined && metadata.image !== undefined) {
          const { image } = metadata
          const resolvedGateway = {
            ...baseResolvedAvatar,
            resolved: { avatar: storageGatewayURL(image) },
          }

          this.cachedResolvedEIP155Avatars[normalizedAvatarUri] =
            resolvedGateway
          return resolvedGateway
        }
      }
    }

    // If not an EIP URI, assume we're looking at a standard URL; if that
    // fails, log an error and just return undefined.
    try {
      const plainURL = storageGatewayURL(avatarUri)
      return {
        ...baseResolvedAvatar,
        resolved: { avatar: plainURL },
      }
    } catch (error) {
      logger.error("Unexpected avatar URI scheme", avatarUri)
      return undefined
    }
  }
}
// TODO resolve content, eg IPFS hashes
