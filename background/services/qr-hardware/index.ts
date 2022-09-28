import { BaseKeyring as QRKeyring } from "@keystonehq/base-eth-keyring"
import {
  EthSignRequest,
  ETHSignature,
  CryptoHDKey,
  CryptoAccount,
  DataType,
} from "@keystonehq/bc-ur-registry-eth"
import { UR } from "@ngraveio/bc-ur"
import * as uuid from "uuid"
import {
  serialize,
  UnsignedTransaction,
  parse as parseRawTransaction,
} from "@ethersproject/transactions"
import { SignedTransaction, TransactionRequestWithNonce } from "../../networks"
import { HexString } from "../../types"
import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, QRHardwareDatabase } from "./db"
import { normalizeEVMAddress } from "../../lib/utils"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"

export type QRHardwareAccountSigner = {
  type: "qr-hardware"
  deviceID: string
  path: string
}

export type SyncedDevice = {
  id: string
}

type Events = ServiceLifecycleEvents & {
  synced: SyncedDevice
  address: { id: string; derivationPath: string; address: HexString }
  requestSignature: { id: string; ur: UR }
  signedTransaction: { id: string; cbor: string }
  cancelSignature: { id: string }
}

const getKeyringFromUR = ({ type, cbor }: { type: string; cbor: string }) => {
  const keyring = new QRKeyring()
  if (type === "crypto-hdkey") {
    const cryptoHDKey = CryptoHDKey.fromCBOR(Buffer.from(cbor, "hex"))
    keyring.syncKeyring(cryptoHDKey)
  } else if (type === "crypto-account") {
    const cryptoAccount = CryptoAccount.fromCBOR(Buffer.from(cbor, "hex"))
    keyring.syncKeyring(cryptoAccount)
  } else {
    throw new Error()
  }
  return keyring
}

export default class QRHardwareService extends BaseService<Events> {
  keyring: QRKeyring | undefined

  deviceID: string | undefined

  static create: ServiceCreatorFunction<Events, QRHardwareService, []> =
    async () => {
      return new this(await getOrCreateDB())
    }

  private constructor(private db: QRHardwareDatabase) {
    super()
  }

  async syncQRKeyring({
    type,
    cbor,
  }: {
    type: string
    cbor: string
  }): Promise<QRKeyring> {
    const keyring = getKeyringFromUR({ type, cbor })

    this.keyring = keyring

    const accounts = await keyring.addAccounts()
    // eslint-disable-next-line prefer-destructuring
    this.deviceID = accounts[0]
    this.emitter.emit("synced", { id: this.deviceID })

    const exist = await this.db.getAccountByAddress(this.deviceID)

    if (exist) {
      return keyring
    }

    const qrHardwareAccount = {
      address: normalizeEVMAddress(this.deviceID),
      type,
      cbor,
    }

    await this.db.addAccount(qrHardwareAccount)

    return keyring
  }

  async deriveAddress({
    deviceID,
    path: derivationPath,
  }: QRHardwareAccountSigner): Promise<HexString> {
    const qrHardwareAccount = await this.db.getAccountByAddress(deviceID)
    const keyring: QRKeyring = getKeyringFromUR({
      type: qrHardwareAccount!.type,
      cbor: qrHardwareAccount!.cbor,
    })

    const pathComponents = derivationPath.split("/")
    const index = pathComponents[pathComponents.length - 1]
    // eslint-disable-next-line no-underscore-dangle
    const address = await keyring.__addressFromIndex("m", parseInt(index, 10))
    // eslint-disable-next-line no-underscore-dangle
    const path = await keyring._pathFromAddress(address)
    if (path !== derivationPath) {
      throw new Error("derivation path not matched")
    }

    this.emitter.emit("address", {
      id: normalizeEVMAddress((await keyring.addAccounts())[0]),
      derivationPath,
      address: normalizeEVMAddress(address),
    })

    return address
  }

  async signTransaction(
    transactionRequest: TransactionRequestWithNonce,
    { deviceID, path: derivationPath, type }: QRHardwareAccountSigner
  ): Promise<SignedTransaction> {
    const qrHardwareAccount = await this.db.getAccountByAddress(deviceID)
    const keyring: QRKeyring = getKeyringFromUR({
      type: qrHardwareAccount!.type,
      cbor: qrHardwareAccount!.cbor,
    })

    const ethersTx = ethersTransactionFromTransactionRequest(transactionRequest)

    const serializedTx = serialize(ethersTx as UnsignedTransaction).substring(2)

    const t: QRHardwareAccountSigner = { deviceID, path: derivationPath, type }
    const address = await this.deriveAddress(t)

    const requestId = uuid.v4()

    const ethSignRequest = EthSignRequest.constructETHRequest(
      Buffer.from(serializedTx, "hex"),
      ethersTx.type === 0 ? DataType.transaction : DataType.typedTransaction,
      derivationPath,
      (await keyring.serialize()).xfp,
      requestId,
      ethersTx.chainId,
      address
    )

    return new Promise((resolve, reject) => {
      const ur = ethSignRequest.toUR()
      this.emitter.emit("requestSignature", { id: requestId, ur })

      this.emitter.on("signedTransaction", ({ id, cbor }) => {
        if (id !== requestId) return

        const ethSignature = ETHSignature.fromCBOR(Buffer.from(cbor, "hex"))

        const signature = ethSignature.getSignature()

        const r = signature.slice(0, 32)
        const s = signature.slice(32, 64)
        const v = signature.slice(64)

        const signedTransaction = serialize(ethersTx as UnsignedTransaction, {
          r: `0x${r.toString("hex")}`,
          s: `0x${s.toString("hex")}`,
          v: parseInt(v.toString("hex"), 16),
        })

        const tx = parseRawTransaction(signedTransaction)

        if (
          !tx.hash ||
          !tx.from ||
          !tx.r ||
          !tx.s ||
          typeof tx.v === "undefined"
        ) {
          throw new Error("Transaction doesn't appear to have been signed.")
        }

        if (
          tx.type !== 0 &&
          tx.type !== 1 &&
          tx.type !== 2 &&
          tx.type !== null
        ) {
          throw new Error(`Unknown transaction type ${tx.type}`)
        }

        const signedTx = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          nonce: tx.nonce,
          input: tx.data,
          value: tx.value.toBigInt(),
          type: tx.type,
          gasPrice: tx.gasPrice ? tx.gasPrice.toBigInt() : null,
          maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toBigInt() : null,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas
            ? tx.maxPriorityFeePerGas.toBigInt()
            : null,
          gasLimit: tx.gasLimit.toBigInt(),
          r: tx.r,
          s: tx.s,
          v: tx.v,
          blockHash: null,
          blockHeight: null,
          asset: transactionRequest.network.baseAsset,
          network: transactionRequest.network,
        } as const

        resolve(signedTx)
      })

      this.emitter.on("cancelSignature", ({ id }) => {
        if (id !== requestId) return

        reject(new Error("Signing canceled"))
      })
    })
  }
}
