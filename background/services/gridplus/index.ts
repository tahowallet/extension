import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { storage } from "webextension-polyfill"
import {
  fetchAddresses,
  pair,
  setup,
  signMessage,
  sign,
  Constants,
} from "gridplus-sdk"
import {
  TransactionFactory,
  TypedTransaction,
  FeeMarketEIP1559TxData,
} from "@ethereumjs/tx"
import { EIP712TypedData, HexString } from "../../types"
import { getAddress, hexlify, joinSignature } from "ethers/lib/utils"
import { BigNumber } from "ethers"
import { TypedDataUtils, TypedMessage } from "@metamask/eth-sig-util"
import {
  SignedTransaction,
  TransactionRequestWithNonce,
  isEIP1559TransactionRequest,
} from "../../networks"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"
import {
  UnsignedTransaction,
  parse,
  serialize,
} from "@ethersproject/transactions"
import { encode } from "rlp"

const APP_NAME = "Taho Wallet"
const CLIENT_STORAGE_KEY = "GRIDPLUS_CLIENT"
const ADDRESSES_STORAGE_KEY = "GRIDPLUS_ADDRESSES"

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

  async writeClient(client: GridplusClient) {
    return storage.local.set({
      [CLIENT_STORAGE_KEY]: client,
    })
  }

  async readAddresses() {
    const activeAddresses = JSON.parse(
      (await storage.local.get(ADDRESSES_STORAGE_KEY))?.[ADDRESSES_STORAGE_KEY],
    )
    this.activeAddresses = activeAddresses
    return this.activeAddresses
  }

  async writeAddresses(addresses: GridPlusAddress[]) {
    return storage.local.set({
      [ADDRESSES_STORAGE_KEY]: JSON.stringify(addresses),
    })
  }

  async setupClient({
    deviceId,
    password,
  }: {
    deviceId?: string
    password?: string
  }) {
    return setup({
      deviceId,
      password,
      name: APP_NAME,
      getStoredClient: () => this.client ?? "",
      setStoredClient: this.writeClient,
    })
  }

  async pairDevice({ pairingCode }: { pairingCode: string }) {
    await this.readClient()
    return pair(pairingCode)
  }

  async fetchAddresses({
    n = 10,
    startPath = [0x80000000 + 44, 0x80000000 + 60, 0x80000000, 0, 0],
  }: {
    n?: number
    startPath?: number[]
  }) {
    await this.readClient()
    return fetchAddresses({ n, startPath })
  }

  async importAddresses({ address }: { address: GridPlusAddress }) {
    this.activeAddresses.push(address)
    await this.writeAddresses(this.activeAddresses)
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
    const response = await signMessage(hexDataToSign, {
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
    const { domain, types, primaryType, message } = TypedDataUtils.sanitizeData(
      typedData as any,
    )
    const eip712Data = {
      types,
      primaryType,
      domain,
      message,
    }
    const response = await signMessage(eip712Data, {
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
    let ethersTx = ethersTransactionFromTransactionRequest({
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
        curveType: Constants.SIGNING.CURVES.SECP256K1,
        hashType: Constants.SIGNING.HASHES.KECCAK256,
        encodingType: Constants.SIGNING.ENCODINGS.EVM,
        payload:
          ethersTx.type === 2
            ? txPayload.getMessageToSign()
            : encode(txPayload.getMessageToSign()),
      },
    }
    const response = await sign([], signPayload)
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
    } else {
      throw new Error("error signing transaction with gridplus")
    }
  }
}
