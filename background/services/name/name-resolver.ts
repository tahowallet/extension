import { AddressOnNetwork, NameOnNetwork } from "../../accounts"
import { Network } from "../../networks"

/**
 * This interface must be implemented by a resolver that can be used to resolve
 * names. It also implements support, when the underlying resolver supports it,
 * for resolving avatars and reverse-resolving names from addresses.
 *
 * When a network is passed to a name resolver function, the resolver MUST
 * return results for the same network that was passed.
 *
 * Name resolvers are checked in two phases, one which is used to statically
 * decide whether a resolver is _likely to be able to_ resolve a name, avatar,
 * or address, and one in which the resolution is attempted. The static phase is
 * used to avoid calls that are known to produce failures, such as attempting to
 * resolve a Bitcoin name on a resolver that only supports Ethereum.
 */
export interface NameResolver<ResolverType extends string> {
  type: ResolverType

  /**
   * Given an address and network, synchronously returns a boolean indicating
   * whether this name resolver can attempt to resolve it. This is useful for
   * avoiding lookups for names that are statically known to be malformed per
   * this resolver, for example trying to look up Bitcoin name on a resolver
   * that only supports Ethereum.
   *
   * Returning false should mean {@see lookUpNameForAddress} will never be
   * called.
   */
  canAttemptNameResolution(addressOnNetwork: AddressOnNetwork): boolean
  /**
   * Given an address and network, synchronously returns a boolean indicating
   * whether this name resolver can attempt to resolve an avatar for that name.
   *
   * Returning false should mean {@see lookUpAvatar} will never be called.
   */
  canAttemptAvatarResolution(
    addressOrNameOnNetwork: AddressOnNetwork | NameOnNetwork
  ): boolean
  /**
   * Given a name and network, synchronously returns a boolean indicating
   * whether this resolver can resolve an address from that network back to a
   * name.
   *
   * Returning false should mean {@see lookUpAddressForName} will never be
   * called.
   */
  canAttemptAddressResolution(nameOnNetwork: NameOnNetwork): boolean

  /**
   * Given a name and network, attempt to resolve it to an address.
   *
   * Returns `undefined` if the address could not be resolved. Should return a
   * rejected promise if {@see canAttemptNameResolution} would have returned
   * `false`, or if internal resolution errors occurred (e.g., an issue
   * communicating with a server).
   */
  lookUpAddressForName(
    nameOnNetwork: NameOnNetwork
  ): Promise<AddressOnNetwork | undefined>
  /**
   * Given an address and network, attempt to resolve an avatar URI for that
   * address. Note that avatar URIs can be EIP155 or ERC721 URNs, not just
   * URLs.
   *
   * Returns `undefined` if the avatar could not be resolved. Should return a
   * rejected promise if {@see canAttemptAvatarResolution} would have returned
   * `false`, or if internal resolution errors occurred (e.g., an issue
   * communicating with a server).
   */
  lookUpAvatar(
    addressOrNameOnNetwork: AddressOnNetwork | NameOnNetwork
  ): Promise<
    | {
        uri: URL | string
        network: Network
      }
    | undefined
  >
  /**
   * Given an address and network, attempt to resolve the name of that address
   * on that network.
   *
   * Returns `undefined` if the avatar could not be resolved. Should return a
   * rejected promise if {@see canAttemptAddressResolution} would have returned
   * `false`, or if internal resolution errors occurred (e.g., an issue
   * communicating with a server).
   */
  lookUpNameForAddress(
    addressOnNetwork: AddressOnNetwork
  ): Promise<NameOnNetwork | undefined>
}
