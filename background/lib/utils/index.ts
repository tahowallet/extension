import { utils } from "ethers"
import HDKeyring, { normalizeHexAddress } from "@tallyho/hd-keyring"
import {
  AugmentedLimitOrder,
  BaseLimitOrder,
  HexString,
  KeeperDAOLimitOrder,
} from "../../types"
import { EVMNetwork } from "../../networks"
import {
  ETHEREUM,
  ROPSTEN,
  RINKEBY,
  GOERLI,
  KOVAN,
  ZEROEX_DOMAIN_DEFAULTS,
} from "../../constants"

import * as ethjs from "ethereumjs-util"
import { ethers } from "ethers"
import axios from "axios"

export function normalizeEVMAddress(address: string | Buffer): HexString {
  return normalizeHexAddress(address)
}

export function truncateDecimalAmount(
  value: number | string,
  decimalLength: number
): string {
  const valueString = value.toString()
  if (valueString.includes(".")) {
    const [integers, decimals] = valueString.split(".")
    return `${integers}.${decimals.substr(0, decimalLength)}`
  }
  return valueString
}

export function sameEVMAddress(
  address1: string | Buffer | undefined,
  address2: string | Buffer | undefined
): boolean {
  if (typeof address1 === "undefined" || typeof address2 === "undefined") {
    return false
  }
  return normalizeHexAddress(address1) === normalizeHexAddress(address2)
}

export function gweiToWei(value: number | bigint): bigint {
  return BigInt(utils.parseUnits(value.toString(), "gwei").toString())
}

export function convertToEth(value: string | number | bigint): string {
  if (value && value >= 1) {
    return utils.formatUnits(BigInt(value))
  }
  return ""
}

export function weiToGwei(value: string | number | bigint): string {
  if (value && value >= 1) {
    return truncateDecimalAmount(utils.formatUnits(BigInt(value), "gwei"), 2)
  }
  return ""
}

/**
 * Encode an unknown input as JSON, special-casing bigints and undefined.
 *
 * @param input an object, array, or primitive to encode as JSON
 */
export function encodeJSON(input: unknown): string {
  return JSON.stringify(input, (_, value) => {
    if (typeof value === "bigint") {
      return { B_I_G_I_N_T: value.toString() }
    }
    return value
  })
}

/**
 * Decode a JSON string, as encoded by `encodeJSON`, including bigint support.
 * Note that the functions aren't invertible, as `encodeJSON` discards
 * `undefined`.
 *
 * @param input a string output from `encodeJSON`
 */
export function decodeJSON(input: string): unknown {
  return JSON.parse(input, (_, value) =>
    value !== null && typeof value === "object" && "B_I_G_I_N_T" in value
      ? BigInt(value.B_I_G_I_N_T)
      : value
  )
}

/**
 * Determine which Ethereum network should be used based on the .env file
 */
export function getEthereumNetwork(): EVMNetwork {
  const ethereumNetwork = process.env.ETHEREUM_NETWORK?.toUpperCase()

  if (ethereumNetwork === "ROPSTEN") {
    return ROPSTEN
  }

  if (ethereumNetwork === "RINKEBY") {
    return RINKEBY
  }

  if (ethereumNetwork === "GOERLI") {
    return GOERLI
  }

  if (ethereumNetwork === "KOVAN") {
    return KOVAN
  }

  // Default to mainnet
  return ETHEREUM
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-5)}`
}

const augmentLimitOrder = async (
  unformattedLimitOrder: BaseLimitOrder,
  orderDetails: KeeperDAOOrderDetails
): Promise<AugmentedLimitOrder> => {
  return {
    makerToken: unformattedLimitOrder.makerToken.toLowerCase(),
    takerToken: unformattedLimitOrder.takerToken.toLowerCase(),
    makerAmount: unformattedLimitOrder.makerAmount.toString().toLowerCase(),
    takerAmount: unformattedLimitOrder.takerAmount.toString().toLowerCase(),
    maker: unformattedLimitOrder.maker.toLowerCase(),
    expiry: unformattedLimitOrder.expiry.toLowerCase(),
    taker: orderDetails.taker,
    txOrigin: orderDetails.txOrigin,
    pool: orderDetails.pool,
    salt: String(Date.now()).toLowerCase(),
  }
}

interface KeeperDAOOrderDetails {
  verifyingContract: string
  chainId: string
  txOrigin: string
  taker: string
  pool: string
}
interface KeeperDAOInfoResponse {
  result: {
    orderDetails: KeeperDAOOrderDetails
  }
}

export const signKeeperDaoLimitOrder = async (
  order: BaseLimitOrder,
  keyring: HDKeyring
): Promise<KeeperDAOLimitOrder> => {
  const keeperDAOInfo = await axios.get<KeeperDAOInfoResponse>(
    "https://hidingbook.keeperdao.com/api/v1/info"
  )

  const { orderDetails } = keeperDAOInfo.data.result
  // The data to sign
  const normalizedLimitOrder = await augmentLimitOrder(order, orderDetails)

  // 0x Domain
  const domain = {
    ...ZEROEX_DOMAIN_DEFAULTS,
    verifyingContract: orderDetails.verifyingContract,
  }

  // The named list of all type definitions
  const types = {
    RfqOrder: [
      { type: "address", name: "makerToken" },
      { type: "address", name: "takerToken" },
      { type: "uint128", name: "makerAmount" },
      { type: "uint128", name: "takerAmount" },
      { type: "address", name: "maker" },
      { type: "address", name: "taker" },
      { type: "address", name: "txOrigin" },
      { type: "bytes32", name: "pool" },
      { type: "uint64", name: "expiry" },
      { type: "uint256", name: "salt" },
    ],
  }

  const signed = await keyring.signTypedData(
    normalizedLimitOrder.maker,
    domain,
    types,
    normalizedLimitOrder as unknown as Record<string, unknown>
  )

  const vals = ethjs.fromRpcSig(signed)

  ethers.utils.hexlify(vals.r)

  const signature = {
    signatureType: 2,
    r: `${ethers.utils.hexlify(vals.r)}`,
    s: `${ethers.utils.hexlify(vals.s)}`,
    v: vals.v,
  }

  return {
    ...normalizedLimitOrder,
    chainId: 1,
    verifyingContract: orderDetails.verifyingContract,
    signature: {
      ...signature,
    },
  }
}
