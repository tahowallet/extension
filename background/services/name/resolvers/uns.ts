import { Resolution as UnstoppableDomainsResolution } from "@unstoppabledomains/resolution"
import fetch from "node-fetch"
import { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import { ETHEREUM } from "../../../constants"
import { sameNetwork } from "../../../networks"
import { NameResolver } from "../name-resolver"

const reverseLookupUNSAddress = async (address: string) => {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_KEY
  const response = await fetch(
    `https://unstoppabledomains.g.alchemy.com/domains/?owners=${address}&sortBy=id&sortDirection=DESC`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ALCHEMY_API_KEY?.trim()}`,
      },
    }
  )
  const data = await response.json()

  return data
}

/**
 * Check if a given string a valid UNS domain
 */
const IsValidUNSDomainName = (s: string): boolean => {
  const trimmedString = s.trim()
  let isValidUNSDomain = false

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
      isValidUNSDomain = true
    }
  }
  return isValidUNSDomain
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
      return sameNetwork(network, ETHEREUM) && IsValidUNSDomainName(name)
    },

    async lookUpAddressForName({
      name,
      network,
    }: NameOnNetwork): Promise<AddressOnNetwork | undefined> {
      // We try to resolve the name using unstoppable domains resolution
      const resolution = new UnstoppableDomainsResolution()
      const currency = ETHEREUM.baseAsset.symbol
      const address = await resolution.addr(name, currency)

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
          : { address: undefined }

      if (address === undefined) {
        return undefined
      }

      const data = await reverseLookupUNSAddress(address)
      const avatarUrn =
        data.data[0]?.attributes?.meta?.records["social.picture.value"]

      if (avatarUrn === undefined || avatarUrn === null) {
        return undefined
      }

      return {
        uri: avatarUrn,
        network,
      }
    },
    async lookUpNameForAddress({
      address,
      network,
    }: AddressOnNetwork): Promise<NameOnNetwork | undefined> {
      const data = await reverseLookupUNSAddress(address)
      const name = data.data[0]?.attributes?.meta?.domain

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
