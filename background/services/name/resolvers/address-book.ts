import PreferenceService from "../../preferences"
import { NameResolver } from "../name-resolver"

export default function addressBookResolverFor(
  preferenceService: PreferenceService
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

    lookUpAddressForName:
      preferenceService.lookUpAddressForName.bind(preferenceService),
    async lookUpAvatar() {
      throw new Error("Avatar resolution not supported in address book.")
    },
    lookUpNameForAddress:
      preferenceService.lookUpNameForAddress.bind(preferenceService),
  }
}
