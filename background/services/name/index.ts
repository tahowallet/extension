import { DomainName, HexString, Network, URI } from "../../types"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"

import { ETHEREUM } from "../../constants/networks"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import ChainService from "../chain"

interface ResolvedAddressRecord {
  from: {
    name: DomainName
  }
  resolved: {
    addressNetwork: {
      address: HexString
      network: Network
    }
  }
  system: "ENS" | "UNS"
}
interface ResolvedNameRecord {
  from: {
    addressNetwork: {
      address: HexString
      network: Network
    }
  }
  resolved: {
    name: DomainName
  }
  system: "ENS" | "UNS"
}

type Events = ServiceLifecycleEvents & {
  resolvedAddress: ResolvedAddressRecord
  resolvedName: ResolvedNameRecord
}

/**
 * The NameService is responsible for resolving human-readable names into
 * addresses and other metadata across multiple networks, caching where
 * appropriate.
 *
 * Initially, the service supports ENS on mainnet Ethereum.
 */
export default class NameService extends BaseService<Events> {
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
    [Promise<ChainService>]
  > = async (chainService) => {
    return new this(await chainService)
  }

  private constructor(private chainService: ChainService) {
    super({})
  }

  async lookUpEthereumAddress(name: DomainName): Promise<HexString | null> {
    // if doesn't end in .eth, throw. TODO turn on other domain endings soon +
    // include support for UNS
    if (!name.match(/.*\.eth$/)) {
      throw new Error("Only .eth names can be resolved today.")
    }
    // TODO ENS lookups should work on Ethereum mainnet and a few testnets as well.
    // This is going to be strange, though, as we'll be looking up ENS names for
    // non-Ethereum networks (eg eventually Bitcoin).
    const provider = this.chainService.pollingProviders.ethereum
    // TODO cache name resolution and TTL
    const address = await provider.resolveName(name)
    if (!address || !address.match(/^0x[a-zA-Z0-9]*$/)) {
      return null
    }
    const normalized = normalizeEVMAddress(address)
    this.emitter.emit("resolvedAddress", {
      from: { name },
      resolved: { addressNetwork: { address: normalized, network: ETHEREUM } },
      system: "ENS",
    })
    return normalized
  }

  async lookUpName(
    address: HexString,
    network: Network
  ): Promise<DomainName | null> {
    // TODO ENS lookups should work on a few testnets as well
    if (network.chainID !== "1") {
      throw new Error("Only Ethereum mainnet is supported.")
    }
    const provider = this.chainService.pollingProviders.ethereum
    // TODO cache name resolution and TTL
    const name = await provider.lookupAddress(address)
    // TODO proper domain name validation ala RFC2181
    if (
      !name ||
      !(
        name.length <= 253 &&
        name.match(
          /^[a-zA-Z0-9][a-zA-Z0-9-]{1,62}\.([a-zA-Z0-9][a-zA-Z0-9-]{1,62}\.)*[a-zA-Z0-9][a-zA-Z0-9-]{1,62}/
        )
      )
    ) {
      return null
    }
    this.emitter.emit("resolvedName", {
      from: { addressNetwork: { address, network } },
      resolved: { name },
      system: "ENS",
    })
    return name
  }

  async lookUpAvatar(
    address: HexString,
    network: Network
  ): Promise<URI | null> {
    // TODO ENS lookups should work on a few testnets as well
    if (network.chainID !== "1") {
      throw new Error("Only Ethereum mainnet is supported.")
    }
    const name = await this.lookUpName(address, network)
    if (!name) {
      return null
    }
    // TODO handle if it doesn't exist
    const provider = this.chainService.pollingProviders.ethereum
    const resolver = await provider.getResolver(name)
    if (!sameEVMAddress(await resolver.getAddress(), address)) {
      return null
    }

    const avatar = await resolver.getText("avatar")

    if (avatar) {
      // TODO this is naughty, do proper URI parsing
      if (avatar.match(/^https:/)) {
        return avatar
      }
      if (avatar.match(/^ipfs:\/\//)) {
        // TODO proper parsing and replace
        // TODO real IPFS support!
        return `https://ipfs.io/ipfs/${avatar.replace(/^ipfs:\/\//, "")}`
      }
    }

    return null
  }
}
// TODO resolve other network addresses (eg Bitcoin)
// TODO resolve content, eg IPFS hashes
