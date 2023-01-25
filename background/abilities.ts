import { NormalizedEVMAddress } from "./types"

type HoldERC20 = {
  type: "hold"
  address: string
}

type OwnNFT = {
  type: "own"
  nftAddress: string
}

type AllowList = {
  type: "allowList"
}

type Unknown = {
  type: "unknown"
}

export type AbilityRequirement = HoldERC20 | OwnNFT | AllowList | Unknown

export type AbilityType = "mint" | "airdrop" | "access" | "claim"

export type Ability = {
  type: AbilityType
  title: string
  description: string | null
  abilityId: string
  linkUrl: string
  imageUrl?: string
  openAt?: string
  closeAt?: string
  completed: boolean
  removedFromUi: boolean
  address: NormalizedEVMAddress
  requirement: AbilityRequirement
}
