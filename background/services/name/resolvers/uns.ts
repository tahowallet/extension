import { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import { ETHEREUM, POLYGON, SECOND } from "../../../constants"
import { ALCHEMY_KEY } from "../../../lib/alchemy"
import { isDefined } from "../../../lib/utils/type-guards"
import { sameNetwork } from "../../../networks"
import { makeFetchWithTimeout } from "../../../utils/fetching"
import { NameResolver } from "../name-resolver"

// Time until response is stale
const RESPONSE_TTL = 5 * SECOND

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cacheAsyncResults = <F extends (...args: any[]) => Promise<any>>(
  ttl: number,
  fn: F,
  getCacheKey: (args: Parameters<F>) => string
) => {
  const cache: Record<
    string,
    | {
        result: ReturnType<F>
        pending: Promise<void>
        expiresAt: number
        status: "done"
      }
    | { pending: Promise<void>; status: "pending" }
    | undefined
  > = {}

  return (async (...args: Parameters<F>) => {
    const key = getCacheKey(args)

    if (cache[key]?.status === "pending") {
      await cache[key]?.pending
    }

    const cachedEntry = cache[key]
    if (cachedEntry?.status === "done" && cachedEntry.expiresAt >= Date.now()) {
      return cachedEntry.result
    }

    let resolve

    const pending = new Promise<void>((r) => {
      resolve = r
    })
    cache[key] = { pending, status: "pending" }

    const result = await fn(...args)
      .then((value) => {
        cache[key] = {
          result: value,
          pending,
          expiresAt: Date.now() + ttl,
          status: "done",
        }

        return value
      })
      .finally(resolve)

    return result
  }) as F
}

const fetchWithTimeout = makeFetchWithTimeout(3_000)

const UNS_SUPPORTED_NETWORKS = [ETHEREUM, POLYGON]

/**
 * Lookup a UNS domain name and fetch the owners address
 */
const lookupUNSDomain = async (domain: string) => {
  const response = await fetchWithTimeout(
    `https://unstoppabledomains.g.alchemy.com/domains/${domain}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ALCHEMY_KEY?.trim()}`,
      },
    }
  )
  const data = await response.json()

  return data
}

/**
 * Reverse lookup an address and fetch it's corresponding UNS domain name
 */
const reverseLookupAddress = cacheAsyncResults(
  RESPONSE_TTL,
  async (address: string) => {
    const response = await fetchWithTimeout(
      `https://unstoppabledomains.g.alchemy.com/domains/?owners=${address}&sortBy=id&sortDirection=ASC`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.ALCHEMY_KEY?.trim()}`,
        },
      }
    )
    const data = await response.json()

    return data
  },
  ([address]) => address
)

/**
 * Check if a given string a valid UNS domain
 */
const isValidUNSDomainName = (s: string): boolean => {
  const trimmedString = s.trim()

  // Any valid domain name will have a period as part of the string
  if (trimmedString.lastIndexOf(".") > 0) {
    const domainExtension = trimmedString.slice(trimmedString.lastIndexOf("."))
    const supportedUNSDomains = [
      ".crypto",
      ".coin",
      ".wallet",
      ".bitcoin",
      ".888",
      ".nft",
      ".dao",
      ".zil",
      ".x",
    ]

    if (supportedUNSDomains.includes(domainExtension)) {
      return true
    }
  }
  return false
}

export default function unsResolver(): NameResolver<"UNS"> {
  return {
    type: "UNS",
    canAttemptNameResolution(): boolean {
      return true
    },
    canAttemptAvatarResolution(): boolean {
      return true
    },
    canAttemptAddressResolution({ name, network }: NameOnNetwork): boolean {
      return (
        isValidUNSDomainName(name) &&
        UNS_SUPPORTED_NETWORKS.some((supportedNetwork) =>
          sameNetwork(network, supportedNetwork)
        )
      )
    },

    async lookUpAddressForName({
      name,
      network,
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      // We try to resolve the name using unstoppable domains resolution
      const address = (await lookupUNSDomain(name))?.meta?.owner

      if (address === undefined || address === null) {
        return undefined
      }

      return {
        address,
        network,
      }
    },
    async lookUpAvatar(
      addressOrNameOnNetwork: AddressOnNetwork | NameOnNetwork
    ) {
      const { network } = addressOrNameOnNetwork
      const { address } =
        "address" in addressOrNameOnNetwork
          ? addressOrNameOnNetwork
          : (await this.lookUpAddressForName(addressOrNameOnNetwork)) ?? {
              address: undefined,
            }

      if (address === undefined) {
        return undefined
      }

      // Then we get all the records associated with the particular ETH address
      const data = (await reverseLookupAddress(address))?.data

      // check if any of the records returned has an NFT picture associated with it
      let avatarUrn = data
        .map(
          (record: {
            attributes: { records: { [x: string]: string | undefined } }
          }) => record.attributes.records["social.picture.value"]
        )
        .find(isDefined)

      if (avatarUrn === undefined || avatarUrn === null) {
        return undefined
      }
      // modify the nft picture value and make it a correct avatar urn
      avatarUrn = avatarUrn.replace(/^1\/(erc1155|erc721)/, "eip155:1/$1")

      return {
        uri: avatarUrn,
        network,
      }
    },
    async lookUpNameForAddress({
      address,
      network,
    }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
      // Get all the records associated with the particular ETH address
      const data = (await reverseLookupAddress(address))?.data
      // Since for a given address you can have multiple UNS records, we just pick the first one
      const name = data
        .map(
          (record: { attributes: { meta: { domain: string | undefined } } }) =>
            record.attributes.meta.domain
        )
        .find(isDefined)

      if (name === undefined || name === null) {
        return undefined
      }

      return {
        name,
        network,
      }
    },
  }
}
