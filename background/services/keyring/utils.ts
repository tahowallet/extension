import { BN } from "ethereumjs-util"
import Common from "@ethereumjs/common"
import {
  FeeMarketEIP1559Transaction,
  FeeMarketEIP1559TxData,
} from "@ethereumjs/tx"

import { TxParams, ImportData, Seed, MsgParams } from "../../types"

interface Opts {
  [key: string]: string | number
}

/**
 * #createReference
 *
 * one way hash method for creating references to mnemonics
 *
 * @returns {Promise<string>} has string
 */

async function createReference(data: string): Promise<string> {
  const dataUint8 = new TextEncoder().encode(data)
  const hashBufer = await crypto.subtle.digest("SHA-256", dataUint8)
  const hashArray = Array.from(new Uint8Array(hashBufer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function formatTransaction(txParams: TxParams): FeeMarketEIP1559TxData {
  return {
    data: txParams.input,
    gasLimit: new BN(txParams.gasLimit.toString(16), 16),
    maxPriorityFeePerGas: new BN(
      txParams.maxPriorityFeePerGas.toString(16),
      16
    ),
    maxFeePerGas: new BN(txParams.maxFeePerGas.toString(16), 16),
    nonce: txParams.nonce.toString(16),
    to: txParams.to,
    value: txParams.value.toString(16),
    chainId: parseInt(txParams.network.chainID, 16),
    type: txParams.type,
  }
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

/**
 * Sign Ethereum Transaction
 *
 * Signs an Ethereum transaction object.
 *
 * @param {Object} ethTx - The transaction to sign.
 * @param {string} _fromAddress - The transaction 'from' address.
 * @param {Object} opts - Signing options.
 * @returns {Promise<string>} The signature string to be broadcasted.
 */
async function signTransaction(
  keyring: any,
  txData: TxParams,
  fromAddress: string,
  opts: Opts = {}
): Promise<string> {
  // map params to new object also define data as input
  const common = new Common({ chain: "mainnet" })
  const txParams = formatTransaction(txData)
  const ethTx = FeeMarketEIP1559Transaction.fromTxData(txParams, { common })

  const from = normalizeAddress(fromAddress)
  const signedTx = await keyring.signTransaction(from, ethTx, opts)
  return `0x${signedTx.serialize().toString("hex")}`
}
