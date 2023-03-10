/* eslint-disable class-methods-use-this */
import {
  Block,
  FeeData,
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/abstract-provider"
import { DexieOptions } from "dexie"
import { BigNumber } from "ethers"
import { keccak256 } from "ethers/lib/utils"
import { AccountBalance, AddressOnNetwork } from "../accounts"
import {
  AnyAsset,
  AnyAssetAmount,
  flipPricePoint,
  isFungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
} from "../assets"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  ETH,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
  USD,
} from "../constants"
import { DaylightAbility } from "../lib/daylight"
import {
  AnyEVMTransaction,
  LegacyEVMTransactionRequest,
  AnyEVMBlock,
  BlockPrices,
  NetworkBaseAsset,
} from "../networks"
import {
  AnalyticsService,
  ChainService,
  IndexingService,
  InternalEthereumProviderService,
  KeyringService,
  LedgerService,
  NameService,
  PreferenceService,
  ProviderBridgeService,
  SigningService,
} from "../services"
import AbilitiesService from "../services/abilities"
import {
  PriorityQueuedTxToRetrieve,
  QueuedTxToRetrieve,
} from "../services/chain"

// We don't want the chain service to use a real provider in tests
jest.mock("../services/chain/serial-fallback-provider")

const createRandom0xHash = () =>
  keccak256(Buffer.from(Math.random().toString()))

export const createPreferenceService = async (): Promise<PreferenceService> => {
  return PreferenceService.create()
}

export const createKeyringService = async (): Promise<KeyringService> => {
  return KeyringService.create()
}

type CreateChainServiceOverrides = {
  preferenceService?: Promise<PreferenceService>
  keyringService?: Promise<KeyringService>
}

export const createChainService = async (
  overrides: CreateChainServiceOverrides = {}
): Promise<ChainService> => {
  return ChainService.create(
    overrides.preferenceService ?? createPreferenceService(),
    overrides.keyringService ?? createKeyringService()
  )
}

export async function createNameService(overrides?: {
  chainService?: Promise<ChainService>
  preferenceService?: Promise<PreferenceService>
}): Promise<NameService> {
  const preferenceService =
    overrides?.preferenceService ?? createPreferenceService()
  return NameService.create(
    overrides?.chainService ?? createChainService({ preferenceService }),
    preferenceService
  )
}

export async function createIndexingService(overrides?: {
  chainService?: Promise<ChainService>
  preferenceService?: Promise<PreferenceService>
  dexieOptions?: DexieOptions
}): Promise<IndexingService> {
  const preferenceService =
    overrides?.preferenceService ?? createPreferenceService()

  return IndexingService.create(
    preferenceService,
    overrides?.chainService ?? createChainService({ preferenceService }),
    overrides?.dexieOptions
  )
}

export const createLedgerService = async (): Promise<LedgerService> => {
  return LedgerService.create()
}

type CreateSigningServiceOverrides = {
  keyringService?: Promise<KeyringService>
  ledgerService?: Promise<LedgerService>
  chainService?: Promise<ChainService>
}

type CreateAbilitiesServiceOverrides = {
  ledgerService?: Promise<LedgerService>
  chainService?: Promise<ChainService>
}

type CreateProviderBridgeServiceOverrides = {
  internalEthereumProviderService?: Promise<InternalEthereumProviderService>
  preferenceService?: Promise<PreferenceService>
}

type CreateInternalEthereumProviderServiceOverrides = {
  chainService?: Promise<ChainService>
  preferenceService?: Promise<PreferenceService>
}

export async function createAnalyticsService(overrides?: {
  chainService?: Promise<ChainService>
  preferenceService?: Promise<PreferenceService>
}): Promise<AnalyticsService> {
  const preferenceService =
    overrides?.preferenceService ?? createPreferenceService()
  return AnalyticsService.create(
    overrides?.chainService ?? createChainService({ preferenceService }),
    preferenceService
  )
}

export const createSigningService = async (
  overrides: CreateSigningServiceOverrides = {}
): Promise<SigningService> => {
  return SigningService.create(
    overrides.keyringService ?? createKeyringService(),
    overrides.ledgerService ?? createLedgerService(),
    overrides.chainService ?? createChainService()
  )
}

export const createAbilitiesService = async (
  overrides: CreateAbilitiesServiceOverrides = {}
): Promise<AbilitiesService> => {
  return AbilitiesService.create(
    overrides.chainService ?? createChainService(),
    overrides.ledgerService ?? createLedgerService()
  )
}

export const createInternalEthereumProviderService = async (
  overrides: CreateInternalEthereumProviderServiceOverrides = {}
): Promise<InternalEthereumProviderService> => {
  return InternalEthereumProviderService.create(
    overrides.chainService ?? createChainService(),
    overrides.preferenceService ?? createPreferenceService()
  )
}

export const createProviderBridgeService = async (
  overrides: CreateProviderBridgeServiceOverrides = {}
): Promise<ProviderBridgeService> => {
  const preferenceService =
    overrides?.preferenceService ?? createPreferenceService()
  return ProviderBridgeService.create(
    overrides.internalEthereumProviderService ??
      createInternalEthereumProviderService({ preferenceService }),
    preferenceService
  )
}

// Copied from a legacy Optimism transaction generated with our test wallet.
export const createLegacyTransactionRequest = (
  overrides: Partial<LegacyEVMTransactionRequest> = {}
): LegacyEVMTransactionRequest => {
  return {
    chainID: OPTIMISM.chainID,
    estimatedRollupFee: 0n,
    estimatedRollupGwei: 0n,
    from: "0x208e94d5661a73360d9387d3ca169e5c130090cd",
    gasLimit: 342716n,
    gasPrice: 40300000000n,
    input:
      "0x415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000001c97ae6d863eb400000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000004800000000000000000000000000000000000000000000000000000000000000580000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002a0000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000241706553776170000000000000000000000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000001cbc479eb646b2000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000c0788a3ad43d79aa53b09c2eacc313a787d1d607000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000172370d5cd63279efa6d502dab29171933a610af000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000172370d5cd63279efa6d502dab29171933a610af00000000000000000000000000000000000000000000000000002499313007fe00000000000000000000000099b36fdbc582d113af36a21eba06bfeab7b9be120000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000099b36fdbc582d113af36a21eba06bfeab7b9be120000000000000000000000000000000000000000000000a45bb7e7a86313733c",
    network: OPTIMISM,
    to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
    type: 0,
    value: 10000000000000000n,
    ...overrides,
  }
}

export const createAnyEVMTransaction = (
  overrides: Partial<AnyEVMTransaction> = {}
): AnyEVMTransaction => {
  return {
    asset: ETH,
    blockHash: createRandom0xHash(),
    blockHeight: 15547463,
    from: "0x208e94d5661a73360d9387d3ca169e5c130090cd",
    gasLimit: 527999n,
    gasPrice: 40300000000n,
    hash: createRandom0xHash(),
    input:
      "0x415565b0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000f4c83080e80ae530d6f8180572cbbf1ac9d5d43500000000000000000000000000000000000000000000000006f05b59d3b2000000000000000000000000000000000000000000000000000084784181bd7017cc00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000004a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000900000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000006f05b59d3b20000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000006f05b59d3b2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000012556e697377617056330000000000000000000000000000000000000000000000000000000000000006f05b59d3b200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002b0d500b1d8e8ef31e21c99d1db9a6444d3adf12700001f42791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000f4c83080e80ae530d6f8180572cbbf1ac9d5d435000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002a0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002517569636b5377617000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000008521d131bfaa40df000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000f4c83080e80ae530d6f8180572cbbf1ac9d5d435000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000f4c83080e80ae530d6f8180572cbbf1ac9d5d43500000000000000000000000000000000000000000000000000a98fb0023a291400000000000000000000000099b36fdbc582d113af36a21eba06bfeab7b9be120000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd00000000000000000000000099b36fdbc582d113af36a21eba06bfeab7b9be1200000000000000000000000000000000000000000000005ab9dccabd63136f33",
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    network: OPTIMISM,
    nonce: 156,
    r: "0x1492a3699be79b1c6c0f77505556cc90194ba8fe3317d83ce4075f3292108cd0",
    s: "0xc6480bb00fa6e1f630ec004cdca7c725e6d8e964b8201b9cc6471e750415181",
    to: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
    type: 0,
    v: 309,
    value: 500000000000000000n,
    ...overrides,
  }
}

export const createAnyEVMBlock = (
  overrides: Partial<AnyEVMBlock> = {}
): AnyEVMBlock => {
  return {
    hash: createRandom0xHash(),
    parentHash: createRandom0xHash(),
    difficulty: 1000000000000n,
    blockHeight: 15547463,
    timestamp: Date.now(),
    network: OPTIMISM,
    ...overrides,
  }
}

export const createAccountBalance = (
  overrides: Partial<AccountBalance> = {}
): AccountBalance => ({
  address: createRandom0xHash(),
  assetAmount: {
    asset: {
      metadata: {
        tokenLists: [],
      },
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      homeNetwork: ETHEREUM,
      contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    },
    amount: 5000000n,
  },
  network: ETHEREUM,
  blockHeight: BigInt(15547463),
  retrievedAt: Date.now(),
  dataSource: "alchemy",
  ...overrides,
})

export const createAddressOnNetwork = (
  overrides: Partial<AddressOnNetwork> = {}
): AddressOnNetwork => ({
  address: createRandom0xHash(),
  network: ETHEREUM,
  ...overrides,
})

export const createBlockPrices = (
  overrides: Partial<BlockPrices> = {}
): BlockPrices => ({
  baseFeePerGas: 0n,
  blockNumber: 25639147,
  dataSource: "local",
  estimatedPrices: [
    {
      confidence: 99,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      price: 1001550n,
    },
  ],
  network: ETHEREUM,
  ...overrides,
})

export const createQueuedTransaction = (
  overrides: Partial<QueuedTxToRetrieve> = {}
): QueuedTxToRetrieve => ({
  network: OPTIMISM,
  hash: createRandom0xHash(),
  firstSeen: Date.now(),
  ...overrides,
})

export const createTransactionsToRetrieve = (
  numberOfTx = 100
): PriorityQueuedTxToRetrieve[] => {
  const NETWORKS = [ETHEREUM, POLYGON, ARBITRUM_ONE, AVALANCHE, OPTIMISM]

  return [...Array(numberOfTx).keys()].map((_, ind) => ({
    transaction: createQueuedTransaction({
      network: NETWORKS[ind % NETWORKS.length],
    }),
    priority: 0,
  }))
}

export const createTransactionResponse = (
  overrides: Partial<TransactionResponse> = {}
): TransactionResponse => ({
  hash: createRandom0xHash(),
  blockNumber: 25639147,
  blockHash: createRandom0xHash(),
  timestamp: Date.now(),
  confirmations: 0,
  from: createRandom0xHash(),
  nonce: 570,
  gasLimit: BigNumber.from(15000000),
  data: "...",
  value: BigNumber.from(15000000),
  chainId: Number(OPTIMISM.chainID),
  wait: () => Promise.resolve({} as TransactionReceipt),
  ...overrides,
})

export const makeEthersBlock = (overrides?: Partial<Block>): Block => {
  return {
    hash: "0x20567436620bf18c07cf34b3ec4af3e530d7a2391d7a87fb0661565186f4e834",
    parentHash:
      "0x9b97cacd4900848628fb9efcc25da51e56c08f27604b5947151ccf6401b915c6",
    number: 30639839,
    timestamp: 1666373439,
    nonce: "0x0000000000000000",
    difficulty: 2,
    gasLimit: BigNumber.from(15000000),
    gasUsed: BigNumber.from(295345),
    miner: "0x0000000000000000000000000000000000000000",
    extraData:
      "0xd98301090a846765746889676f312e31352e3133856c696e75780000000000006028a2a4a8d227a5f0b51f8c71096d9b86374a7831ec6928f00d296eac6a42850d332d31c15b6f71509708a252f1af3317c35b137d6411710b13f90a0a1148e900",
    transactions: [
      "0x2fe683d3a72693e9c338f430e9af68a3b69d449ab04f191d5eff9010c4e94da0",
    ],
    _difficulty: BigNumber.from(2),
    ...overrides,
  }
}

export const makeEthersFeeData = (overrides?: Partial<FeeData>): FeeData => {
  return {
    maxFeePerGas: BigNumber.from(123274909666),
    maxPriorityFeePerGas: BigNumber.from(2500000000),
    gasPrice: BigNumber.from(91426599419),
    ...overrides,
  }
}

const getRandomStr = (length: number) => {
  let result = ""

  while (result.length < length) {
    result += Math.random().toString(36).slice(2)
  }

  return result.slice(0, length)
}

export const createSmartContractAsset = (
  overrides: Partial<SmartContractFungibleAsset> = {}
): SmartContractFungibleAsset => {
  const symbol = overrides.symbol ?? getRandomStr(3)
  const asset = {
    metadata: {
      logoURL:
        "https://messari.io/asset-images/0783ede3-4b2c-418a-9f82-f171894c70e2/128.png",
      tokenLists: [
        {
          url: "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
          name: "Uniswap Labs Default",
          logoURL: "ipfs://QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir",
        },
      ],
    },
    name: `${symbol} Network`,
    symbol,
    decimals: 18,
    homeNetwork: ETHEREUM,
    contractAddress: createRandom0xHash(),
  }

  return {
    ...asset,
    ...overrides,
  }
}

export const createNetworkBaseAsset = (
  overrides: Partial<NetworkBaseAsset> = {}
): NetworkBaseAsset => {
  const symbol = getRandomStr(3)
  const asset: NetworkBaseAsset = {
    metadata: {
      coinGeckoID: "ethereum",
      logoURL: "http://example.com/foo.png",
      tokenLists: [],
    },
    name: `${symbol} Network`,
    symbol,
    decimals: 18,
    coinType: 60,
    chainID: "1",
    contractAddress: createRandom0xHash(),
  }

  return {
    ...asset,
    ...overrides,
  }
}

export const createAssetAmount = (
  asset: AnyAsset = ETH,
  amount = 1
): AnyAssetAmount => {
  return {
    asset,
    amount: BigInt(Math.trunc(1e10 * amount)) * 10n ** 8n,
  }
}

export const createDaylightAbility = (
  overrides: Partial<DaylightAbility> = {}
): DaylightAbility => ({
  type: "mint",
  title: "Test ability!",
  description: "Test description",
  imageUrl: "./images/test.png",
  openAt: null,
  closeAt: null,
  isClosed: false,
  createdAt: "2023-02-20T17:24:25.000Z",
  chain: "ethereum",
  sourceId: "",
  uid: "",
  slug: getRandomStr(5),
  requirements: [
    {
      type: "onAllowlist",
      chain: "ethereum",
      addresses: ["0x208e94d5661a73360d9387d3ca169e5c130090cd"],
    },
  ],
  action: {
    linkUrl: "",
    completedBy: [],
  },

  ...overrides,
})

/**
 * @param asset Any type of asset
 * @param price Price, e.g. 1.5 => 1.5$
 * @param flip Return assets and amounts in reverse order
 */
export const createPricePoint = (
  asset: AnyAsset,
  price = 1,
  flip = false
): PricePoint => {
  const decimals = isFungibleAsset(asset) ? asset.decimals : 18

  const pricePoint: PricePoint = {
    pair: [asset, USD],
    amounts: [10n ** BigInt(decimals), BigInt(Math.trunc(1e10 * price))],
    time: Math.trunc(Date.now() / 1e3),
  }

  return flip ? flipPricePoint(pricePoint) : pricePoint
}

export const createArrayWith0xHash = (length: number): string[] =>
  Array.from({ length }).map(() => createRandom0xHash())
