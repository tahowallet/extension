import { DomainName, HexString, URI } from "../../types"
import { Network } from "../../networks"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"
import { ETHEREUM } from "../../constants/networks"
import { getTokenURI, getTokenMetadata } from "../../lib/erc721"

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

// TODO eventually we want proper IPFS and Arweave support
function storageGatewayURL(uri: URI): string {
  // TODO proper URI parsing and replace
  if (uri.match(/^ipfs:\/\//)) {
    return `https://ipfs.io/ipfs/${uri.replace(/^ipfs:\/\//, "")}`
  }
  if (uri.match(/^ar:\/\//)) {
    return `https://arweave.net/${uri.replace(/^ar:\/\//, "")}`
  }
  return uri
}

/**
 * The NameService is responsible for resolving human-readable names into
 * addresses and other metadata across multiple networks, caching where
 * appropriate.
 *
 * Initially, the service supports ENS on mainnet Ethereum.
 */
export default class NameService extends BaseService<Events> {
  private cachedEIP155AvatarURLs: Record<URI, URI> = {}

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

  async lookUpEthereumAddress(
    name: DomainName
  ): Promise<HexString | undefined> {
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
      return undefined
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
  ): Promise<DomainName | undefined> {
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
      return undefined
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
  ): Promise<URL | undefined> {
    // TODO ENS lookups should work on a few testnets as well
    if (network.chainID !== "1") {
      throw new Error("Only Ethereum mainnet is supported.")
    }
    const name = await this.lookUpName(address, network)
    if (!name) {
      return undefined
    }
    // TODO handle if it doesn't exist
    const provider = this.chainService.pollingProviders.ethereum
    const resolver = await provider.getResolver(name)
    if (!sameEVMAddress(await resolver.getAddress(), address)) {
      return undefined
    }

    const avatar = await resolver.getText("avatar")

    if (avatar) {
      if (avatar.match(/^eip155:1\/erc721:/)) {
        // check if we've cached the resolved URI, otherwise hit the chain
        if (avatar.toLowerCase() in this.cachedEIP155AvatarURLs) {
          // TODO properly cache this with any other non-ENS NFT stuff we do
          return this.cachedEIP155AvatarURLs[avatar.toLowerCase()]
        }
        // these URIs look like eip155:1/erc721:0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6/2430
        // check the spec for more details https://gist.github.com/Arachnid/9db60bd75277969ee1689c8742b75182
        const [, , , erc721Address, nftID] = avatar.split(/[:/]/)
        if (
          typeof erc721Address !== "undefined" &&
          typeof nftID !== "undefined"
        ) {
          const metadata = await getTokenMetadata(
            provider,
            erc721Address,
            BigInt(nftID)
          )

          if (metadata && metadata.image) {
            const { image } = metadata
            const resolvedGateway = storageGatewayURL(image)
            this.cachedEIP155AvatarURLs[avatar] = resolvedGateway
            return resolvedGateway
          }
        }
      }
      if (avatar.match(/^(ipfs|ar):/)) {
        return storageGatewayURL(avatar)
      }
      if (avatar.match(/^https:/)) {
        return avatar
      }
    }

    return undefined
  }
}
// TODO resolve other network addresses (eg Bitcoin)
// TODO resolve content, eg IPFS hashes
