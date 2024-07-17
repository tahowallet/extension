import { storage } from "webextension-polyfill"
import * as GridPlusSdk from "gridplus-sdk"
import { TransactionFactory, type FeeMarketEIP1559TxData } from "@ethereumjs/tx"
import { hexlify, joinSignature } from "ethers/lib/utils"
import { BigNumber } from "ethers"
import {
  UnsignedTransaction,
  parse,
  serialize,
} from "@ethersproject/transactions"
import { encode } from "rlp"
import { SignedTransaction, TransactionRequestWithNonce } from "../../networks"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"
import { EIP712TypedData, HexString } from "../../types"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"

const APP_NAME = "Taho Wallet"
const CLIENT_STORAGE_KEY = "GRIDPLUS_CLIENT"
const ADDRESSES_STORAGE_KEY = "GRIDPLUS_ADDRESSES"

const writeClient = (client: GridplusClient) =>
  storage.local.set({
    [CLIENT_STORAGE_KEY]: client,
  })

const writeAddresses = (addresses: GridPlusAddress[]) =>
  storage.local.set({
    [ADDRESSES_STORAGE_KEY]: JSON.stringify(addresses),
  })

export type GridPlusAccountSigner = {
  type: "gridplus"
  path: number[]
}

export type GridPlusAddress = {
  address: string
  addressIndex: number
  path: number[]
}

type GridplusClient = string | null

interface Events extends ServiceLifecycleEvents {
  address: { gridplusIndex: number; derivationPath: number[]; address: string }
}

const addHexPrefix = (data: string) => `0x${data}`

export default class GridplusService extends BaseService<Events> {
  activeAddresses: GridPlusAddress[] = []

  client: GridplusClient = null

  private constructor() {
    super()
    this.readClient()
    this.readAddresses()
  }

  static create: ServiceCreatorFunction<Events, GridplusService, []> =
    async () => new this()

  async readClient() {
    this.client =
      (await storage.local.get(CLIENT_STORAGE_KEY))?.[CLIENT_STORAGE_KEY] ??
      null
    return this.client
  }

  async readAddresses() {
    const persistedAddresses =
      (await storage.local.get(ADDRESSES_STORAGE_KEY))?.[
        ADDRESSES_STORAGE_KEY
      ] ?? "[]"
    const activeAddresses = JSON.parse(persistedAddresses)
    this.activeAddresses = activeAddresses
    return this.activeAddresses
  }

  async setupClient({
    deviceId,
    password,
  }: {
    deviceId?: string
    password?: string
  }) {
    return GridPlusSdk.setup({
      deviceId,
      password,
      name: APP_NAME,
      getStoredClient: () => this.client ?? "",
      setStoredClient: writeClient,
    })
  }

  async pairDevice({ pairingCode }: { pairingCode: string }) {
    await this.readClient()
    return GridPlusSdk.pair(pairingCode)
  }

  async fetchAddresses({
    n = 10,
    startPath = [0x80000000 + 44, 0x80000000 + 60, 0x80000000, 0, 0],
  }: {
    n?: number
    startPath?: number[]
  }) {
    await this.readClient()
    return GridPlusSdk.fetchAddresses({ n, startPath })
  }

  async importAddresses({ address }: { address: GridPlusAddress }) {
    this.activeAddresses.push(address)
    await writeAddresses(this.activeAddresses)
    this.emitter.emit("address", {
      gridplusIndex: address.addressIndex,
      derivationPath: address.path,
      address: address.address,
    })
  }

  async signMessage(
    { address }: { address: HexString },
    hexDataToSign: HexString,
  ) {
    const accounts = await this.readAddresses()
    const accountData = accounts.find((account) => account.address === address)
    const response = await GridPlusSdk.signMessage(hexDataToSign, {
      signerPath: accountData?.path,
      payload: hexDataToSign,
      protocol: "signPersonal",
    })
    const responseAddress = hexlify(response.signer)
    if (responseAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        "GridPlus returned a different address than the one requested",
      )
    }
    if (!response.sig) {
      throw new Error("GridPlus returned an error")
    }
    const signature = joinSignature({
      r: addHexPrefix(response.sig.r.toString("hex")),
      s: addHexPrefix(response.sig.s.toString("hex")),
      v: BigNumber.from(
        addHexPrefix(response.sig.v.toString("hex")),
      ).toNumber(),
    })
    return signature
  }

  async signTypedData(
    { address }: { address: HexString },
    typedData: EIP712TypedData,
  ) {
    if (
      typeof typedData !== "object" ||
      !(typedData.types || typedData.primaryType || typedData.domain)
    ) {
      throw new Error("unsupported typed data version")
    }
    const accounts = await this.readAddresses()
    const accountData = accounts.find((account) => account.address === address)
    const eip712Data = {
      types: typedData.types,
      primaryType: typedData.primaryType,
      domain: typedData.domain,
      message: typedData.message,
    }
    const response = await GridPlusSdk.signMessage(eip712Data, {
      signerPath: accountData?.path,
      protocol: "eip712",
      payload: eip712Data,
    })
    const responseAddress = hexlify(response.signer)
    if (responseAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        "Address not found on this wallet. Try another SafeCard or remove the SafeCard to use the wallet on your device.",
      )
    }
    if (!response.sig) {
      throw new Error("GridPlus returned an error")
    }
    const signature = joinSignature({
      r: addHexPrefix(response.sig.r.toString("hex")),
      s: addHexPrefix(response.sig.s.toString("hex")),
      v: BigNumber.from(
        addHexPrefix(response.sig.v.toString("hex")),
      ).toNumber(),
    })
    return signature
  }

  async signTransaction(
    { address }: { address: HexString },
    transactionRequest: TransactionRequestWithNonce,
  ): Promise<SignedTransaction> {
    const ethersTx = ethersTransactionFromTransactionRequest({
      ...transactionRequest,
      from: address,
    })
    const accounts = await this.readAddresses()
    const accountData = accounts.find((account) => account.address === address)
    const txPayload = TransactionFactory.fromTxData(
      ethersTx as FeeMarketEIP1559TxData,
    )
    const signPayload = {
      data: {
        signerPath: accountData?.path,
        chain: ethersTx.chainId,
        curveType: GridPlusSdk.Constants.SIGNING.CURVES.SECP256K1,
        hashType: GridPlusSdk.Constants.SIGNING.HASHES.KECCAK256,
        encodingType: GridPlusSdk.Constants.SIGNING.ENCODINGS.EVM,
        payload:
          ethersTx.type === 2
            ? txPayload.getMessageToSign()
            : encode(txPayload.getMessageToSign()),
      },
    }
    const response = await GridPlusSdk.sign([], signPayload)
    const r = addHexPrefix(response.sig.r.toString("hex"))
    const s = addHexPrefix(response.sig.s.toString("hex"))
    const v = BigNumber.from(
      addHexPrefix(response.sig.v.toString("hex")),
    ).toNumber()
    if (response.pubkey) {
      const serializedTransaction = serialize(ethersTx as UnsignedTransaction, {
        r,
        s,
        v,
      })
      const parsedTx = parse(serializedTransaction)
      if (parsedTx.from?.toLowerCase() !== address?.toLowerCase()) {
        throw new Error(
          "Address not found on this wallet. Try another SafeCard or remove the SafeCard to use the wallet on your device.",
        )
      }
      return {
        hash: parsedTx.hash ?? "",
        from: parsedTx.from,
        to: parsedTx.to,
        nonce: parsedTx.nonce,
        input: parsedTx.data,
        value: parsedTx.value.toBigInt(),
        type: (parsedTx.type ?? null) as never,
        gasPrice: parsedTx.gasPrice ? parsedTx.gasPrice.toBigInt() : null,
        maxFeePerGas: parsedTx.maxFeePerGas
          ? parsedTx.maxFeePerGas.toBigInt()
          : null,
        maxPriorityFeePerGas: parsedTx.maxPriorityFeePerGas
          ? parsedTx.maxPriorityFeePerGas.toBigInt()
          : null,
        gasLimit: parsedTx.gasLimit.toBigInt(),
        r,
        s,
        v,
        blockHash: null,
        blockHeight: null,
        asset: transactionRequest.network.baseAsset,
        network: transactionRequest.network,
      }
    }
    throw new Error("error signing transaction with gridplus")
  }
}
