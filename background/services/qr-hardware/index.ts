import {
  BaseKeyring as QRKeyring,
  StoredKeyring,
} from "@keystonehq/base-eth-keyring"
import {
  EthSignRequest,
  ETHSignature,
  CryptoHDKey,
  CryptoAccount,
  DataType,
} from "@keystonehq/bc-ur-registry-eth"
import * as uuid from "uuid"
import {
  serialize,
  UnsignedTransaction,
  parse as parseRawTransaction,
} from "@ethersproject/transactions"
import { joinSignature } from "ethers/lib/utils"
import { SignedTransaction, TransactionRequestWithNonce } from "../../networks"
import { EIP712TypedData, HexString } from "../../types"
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
  keyring: {
    mode: string | undefined
    xfp: string
    xpub: string
    hdPath: string
    childrenPath: string
  }
}

export interface SerializedUR {
  type: string
  cbor: string
}

export interface URRequest {
  id: string
  ur: SerializedUR
}

type Events = ServiceLifecycleEvents & {
  synced: SyncedDevice
  address: { id: string; derivationPath: string; address: HexString }
  requestSignature: { id: string; ur: { type: string; cbor: string } }
  resolvedSignature: URRequest
  cancelSignature: undefined
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
  }): Promise<SyncedDevice> {
    const keyring = getKeyringFromUR({ type, cbor })

    const accounts = await keyring.addAccounts()
    const deviceID = accounts[0]

    const serializedKeyring: StoredKeyring = await keyring.serialize()
    const syncedDevice: SyncedDevice = {
      id: deviceID,
      keyring: {
        mode: serializedKeyring.keyringMode,
        xfp: serializedKeyring.xfp,
        xpub: serializedKeyring.xpub,
        hdPath: serializedKeyring.hdPath,
        childrenPath: serializedKeyring.childrenPath,
      },
    }
    this.emitter.emit("synced", syncedDevice)

    const exist = await this.db.getAccountByAddress(deviceID)

    if (exist) {
      return syncedDevice
    }

    const qrHardwareAccount = {
      address: normalizeEVMAddress(deviceID),
      type,
      cbor,
    }

    await this.db.addAccount(qrHardwareAccount)

    return syncedDevice
  }

  async deriveAddress({
    deviceID,
    path: derivationPath,
  }: QRHardwareAccountSigner): Promise<HexString> {
    const qrHardwareAccount = await this.db.getAccountByAddress(deviceID)
    if (!qrHardwareAccount) {
      throw new Error(`QR hardware not found for device ID ${deviceID}`)
    }

    const keyring: QRKeyring = getKeyringFromUR({
      type: qrHardwareAccount.type,
      cbor: qrHardwareAccount.cbor,
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

    return normalizeEVMAddress(address)
  }

  async signTransaction(
    transactionRequest: TransactionRequestWithNonce,
    signer: QRHardwareAccountSigner
  ): Promise<SignedTransaction> {
    this.emitter.clearListeners("resolvedSignature")
    this.emitter.clearListeners("cancelSignature")

    const qrHardwareAccount = await this.db.getAccountByAddress(signer.deviceID)
    if (!qrHardwareAccount) {
      throw new Error(`QR hardware not found for device ID ${signer.deviceID}`)
    }

    const keyring: QRKeyring = getKeyringFromUR({
      type: qrHardwareAccount.type,
      cbor: qrHardwareAccount.cbor,
    })

    const ethersTx = ethersTransactionFromTransactionRequest(transactionRequest)

    const serializedTx = serialize(ethersTx as UnsignedTransaction).substring(2)

    const address = await this.deriveAddress(signer)

    const requestId = uuid.v4()

    const ethSignRequest = EthSignRequest.constructETHRequest(
      Buffer.from(serializedTx, "hex"),
      ethersTx.type === 0 ? DataType.transaction : DataType.typedTransaction,
      signer.path,
      (await keyring.serialize()).xfp,
      requestId,
      ethersTx.chainId,
      address
    )

    return new Promise((resolve, reject) => {
      const ur = ethSignRequest.toUR()
      this.emitter.emit("requestSignature", {
        id: requestId,
        ur: { type: ur.type, cbor: ur.cbor.toString("hex") },
      })

      this.emitter
        .once("resolvedSignature")
        .then(({ ur: { cbor } }: URRequest) => {
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

          this.emitter.clearListeners("cancelSignature")
          resolve(signedTx)
        })

      this.emitter.once("cancelSignature").then(() => {
        this.emitter.clearListeners("resolvedSignature")

        reject(new Error("Cancelled signing"))
      })
    })
  }

  async signTypedData(
    typedData: EIP712TypedData,
    address: HexString,
    signer: QRHardwareAccountSigner
  ): Promise<string> {
    this.emitter.clearListeners("resolvedSignature")
    this.emitter.clearListeners("cancelSignature")

    const qrHardwareAccount = await this.db.getAccountByAddress(signer.deviceID)
    if (!qrHardwareAccount) {
      throw new Error(`QR hardware not found for device ID ${signer.deviceID}`)
    }

    const keyring: QRKeyring = getKeyringFromUR({
      type: qrHardwareAccount.type,
      cbor: qrHardwareAccount.cbor,
    })

    // eslint-disable-next-line no-underscore-dangle
    const hdPath = await keyring._pathFromAddress(address)
    const requestId = uuid.v4()
    const ethSignRequest = EthSignRequest.constructETHRequest(
      Buffer.from(JSON.stringify(typedData), "utf-8"),
      DataType.typedData,
      hdPath,
      (await keyring.serialize()).xfp,
      requestId,
      undefined,
      address
    )

    const ur = ethSignRequest.toUR()
    this.emitter.emit("requestSignature", {
      id: requestId,
      ur: { type: ur.type, cbor: ur.cbor.toString("hex") },
    })

    return new Promise((resolve, reject) => {
      this.emitter
        .once("resolvedSignature")
        .then(({ ur: { cbor } }: URRequest) => {
          const ethSignature = ETHSignature.fromCBOR(Buffer.from(cbor, "hex"))

          const signature = ethSignature.getSignature()

          const r = signature.slice(0, 32)
          const s = signature.slice(32, 64)
          const v = signature.slice(64)
          const serializedSignature = joinSignature({
            r: `0x${r.toString("hex")}`,
            s: `0x${s.toString("hex")}`,
            v: parseInt(v.toString("hex"), 16),
          })

          this.emitter.clearListeners("cancelSignature")
          resolve(serializedSignature)
        })

      this.emitter.once("cancelSignature").then(() => {
        this.emitter.clearListeners("resolvedSignature")

        reject(new Error("Cancelled signing"))
      })
    })
  }
}
