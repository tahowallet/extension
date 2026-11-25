import type { AddressOnNetwork, NameOnNetwork } from "../../../accounts"
import { NameResolver } from "../name-resolver"

/**
 * The address book lookups a resolver needs. The NameService holds the address
 * book and decides which entries apply on a given network.
 */
export type AddressBookLookups = {
  lookUpAddressBookAddress(
    nameOnNetwork: NameOnNetwork,
  ): Promise<AddressOnNetwork | undefined>
  lookUpAddressBookName(
    addressOnNetwork: AddressOnNetwork,
  ): Promise<NameOnNetwork | undefined>
}

export default function addressBookResolverFor(
  addressBook: AddressBookLookups,
): NameResolver<"tally-address-book"> {
  return {
    type: "tally-address-book",

    canAttemptNameResolution(): boolean {
      return true
    },
    canAttemptAvatarResolution(): boolean {
      return false
    },
    canAttemptAddressResolution(): boolean {
      return true
    },

    async lookUpAddressForName(nameOnNetwork: NameOnNetwork) {
      return addressBook.lookUpAddressBookAddress(nameOnNetwork)
    },
    async lookUpAvatar() {
      throw new Error("Avatar resolution not supported in address book.")
    },
    async lookUpNameForAddress(addressOnNetwork: AddressOnNetwork) {
      return addressBook.lookUpAddressBookName(addressOnNetwork)
    },
  }
}
