import { Ability } from "@tallyho/tally-background/abilities"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import {
  AccountData,
  AccountState,
} from "@tallyho/tally-background/redux-slices/accounts"
import {
  NFTCached,
  NFTCollectionCached,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { NormalizedEVMAddress } from "@tallyho/tally-background/types"

export const TEST_ADDRESS =
  "0x208e94d5661a73360d9387d3ca169e5c130090cd" as NormalizedEVMAddress

export const createAccountData = (
  overrides: Partial<AccountData> = {}
): AccountData => {
  return {
    address: TEST_ADDRESS,
    network: ETHEREUM,
    balances: {},
    ens: {
      name: "test.crypto",
    },
    defaultName: "Test",
    defaultAvatar: "test.png",
    ...overrides,
  }
}

export const createAccountState = (
  overrides: Partial<AccountState> = {}
): AccountState => {
  return {
    accountsData: {
      evm: {
        [ETHEREUM.chainID]: {
          [TEST_ADDRESS]: {
            ...createAccountData(),
          },
        },
      },
    },
    combinedData: {
      totalMainCurrencyValue: "",
      assets: [],
    },
    ...overrides,
  }
}

export const createAbility = (overrides: Partial<Ability> = {}): Ability => {
  return {
    type: "mint",
    title: "Test Ability",
    description: null,
    abilityId: "",
    slug: "",
    linkUrl: "",
    completed: false,
    removedFromUi: false,
    address: TEST_ADDRESS,
    requirement: {
      type: "hold",
      address: "",
    },
    ...overrides,
  }
}

export const createNFT = (overrides: Partial<NFTCached> = {}): NFTCached => {
  return {
    id: "",
    tokenId: "",
    name: "",
    description: "",
    thumbnailURL: "",
    previewURL: "",
    transferDate: Date.now().toString(),
    attributes: [],
    collectionID: "",
    contract: "",
    owner: "0x208e94d5661a73360d9387d3ca169e5c130090cd",
    isBadge: false,
    chainID: ETHEREUM.chainID,
    rarityRank: null,
    ...overrides,
  }
}

export const createNFTCollection = (
  overrides: Partial<NFTCollectionCached> = {}
): NFTCollectionCached => {
  return {
    id: "",
    name: "",
    owner: "0x208e94d5661a73360d9387d3ca169e5c130090cd",
    hasBadges: false,
    nfts: [],
    hasNextPage: false,
    chainID: ETHEREUM.chainID,
    ...overrides,
  }
}
