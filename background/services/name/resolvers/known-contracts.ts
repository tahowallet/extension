import PreferenceService from "../../preferences"
import { NameResolver } from "../name-resolver"

export default function knownContractResolverFor(
  preferenceService: PreferenceService
): NameResolver<"tally-known-contracts"> {
  return {
    type: "tally-known-contracts",
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
      preferenceService.lookUpAddressForContractName.bind(preferenceService),
    async lookUpAvatar() {
      throw new Error(
        "Avatar resolution not supported in known contracts resolver."
      )
    },
    lookUpNameForAddress:
      preferenceService.lookUpNameForContractAddress.bind(preferenceService),
  }
}
