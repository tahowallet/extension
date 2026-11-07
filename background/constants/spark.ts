import type {
  NetworkBaseAsset,
  SparkNetwork,
  SparkNetworkType,
} from "../networks"

/**
 * Bitcoin as held on Spark. 8 decimals, so amounts are denominated in
 * satoshis.
 */
export const SPARK_BTC: NetworkBaseAsset = {
  chainID: "spark-mainnet",
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
  coinType: 0,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
}

export const SPARK_REGTEST_BTC: NetworkBaseAsset = {
  ...SPARK_BTC,
  chainID: "spark-regtest",
  // Regtest bitcoin has no market value; it is never priced (see
  // selectSparkMainCurrencyTotal), but shares Bitcoin's metadata for display.
}

const SPARK_EXPLORER_URL = "https://www.sparkscan.io"

export const SPARK_MAINNET: SparkNetwork = {
  name: "Spark",
  baseAsset: SPARK_BTC,
  chainID: "spark-mainnet",
  family: "SPARK",
  sparkNetworkType: "MAINNET",
  blockExplorerURL: SPARK_EXPLORER_URL,
  blockExplorerNetworkParam: "mainnet",
}

export const SPARK_REGTEST: SparkNetwork = {
  name: "Spark Regtest",
  baseAsset: SPARK_REGTEST_BTC,
  chainID: "spark-regtest",
  family: "SPARK",
  sparkNetworkType: "REGTEST",
  blockExplorerURL: SPARK_EXPLORER_URL,
  blockExplorerNetworkParam: "regtest",
}

export const SPARK_NETWORKS: SparkNetwork[] = [SPARK_MAINNET, SPARK_REGTEST]

export const SPARK_NETWORKS_BY_TYPE: Record<SparkNetworkType, SparkNetwork> = {
  MAINNET: SPARK_MAINNET,
  REGTEST: SPARK_REGTEST,
}

export function sparkNetworkByChainID(
  chainID: string,
): SparkNetwork | undefined {
  return SPARK_NETWORKS.find((network) => network.chainID === chainID)
}

export function sparkExplorerAddressURL(
  network: SparkNetwork,
  address: string,
): string {
  return `${network.blockExplorerURL}/address/${encodeURIComponent(
    address,
  )}?network=${network.blockExplorerNetworkParam}`
}

export function sparkExplorerTransferURL(
  network: SparkNetwork,
  transferID: string,
): string {
  return `${network.blockExplorerURL}/tx/${encodeURIComponent(
    transferID,
  )}?network=${network.blockExplorerNetworkParam}`
}

export function sparkExplorerTokenURL(
  network: SparkNetwork,
  tokenIdentifier: string,
): string {
  return `${network.blockExplorerURL}/token/${encodeURIComponent(
    tokenIdentifier,
  )}?network=${network.blockExplorerNetworkParam}`
}

/**
 * The Spark SDK's default account index per network: mainnet wallets created
 * by other SDK-based wallets start at account 1, regtest at 0. Using the same
 * defaults means the first Spark account Taho derives from a recovery phrase
 * holds the same funds another Spark wallet shows for that phrase.
 */
export const SPARK_DEFAULT_ACCOUNT_NUMBER: Record<SparkNetworkType, number> = {
  MAINNET: 1,
  REGTEST: 0,
}

/**
 * BIP-32 purpose the Spark SDK derives Spark keys under; an account's keys
 * live at `m/8797555'/<accountNumber>'/<0..4>'`.
 */
export const SPARK_DERIVATION_PURPOSE = 8797555

export function sparkAccountDerivationPath(accountNumber: number): string {
  return `m/${SPARK_DERIVATION_PURPOSE}'/${accountNumber}'`
}

/**
 * The derivation path of the first Spark account per network, as offered in
 * onboarding's derivation path dropdown next to the EVM paths.
 */
export const SPARK_DEFAULT_DERIVATION_PATHS: Record<SparkNetworkType, string> =
  {
    MAINNET: sparkAccountDerivationPath(SPARK_DEFAULT_ACCOUNT_NUMBER.MAINNET),
    REGTEST: sparkAccountDerivationPath(SPARK_DEFAULT_ACCOUNT_NUMBER.REGTEST),
  }

/**
 * The Spark network a derivation path from the dropdown stands for, or
 * undefined for EVM paths.
 */
export function sparkNetworkForDerivationPath(
  path: string,
): SparkNetworkType | undefined {
  return (
    Object.keys(SPARK_DEFAULT_DERIVATION_PATHS) as SparkNetworkType[]
  ).find((network) => SPARK_DEFAULT_DERIVATION_PATHS[network] === path)
}
