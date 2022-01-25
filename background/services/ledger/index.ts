import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer"
import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import Eth from "@ledgerhq/hw-app-eth"
import eip55 from "eip55"
import { DeviceModelId } from "@ledgerhq/devices"
import {
  serialize,
  UnsignedTransaction,
  parse as parseRawTransaction,
} from "@ethersproject/transactions"
import { SignatureLike } from "ethers/node_modules/@ethersproject/bytes"
import { EIP1559TransactionRequest, SignedEVMTransaction } from "../../networks"
import { HexString } from "../../types"
import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import logger from "../../lib/logger"
import { getOrCreateDB, LedgerDatabase } from "./db"
import { ethersTransactionRequestFromEIP1559TransactionRequest } from "../chain/utils"
import { ETH } from "../../constants"
import { getEthereumNetwork } from "../../lib/utils"

enum LedgerType {
  UNKNOWN,
  LEDGER_NANO_S,
  LEDGER_NANO_X,
}

type MetaData = {
  ethereumVersion: string
}

type Events = ServiceLifecycleEvents & {
  ledgerAdded: {
    id: string
    type: LedgerType
    accountIDs: string[]
    metadata: MetaData
  }
  ledgerAccountAdded: {
    id: string
    ledgerID: string
    derivationPath: string
    addresses: HexString[]
  }
  connected: { id: string; type: LedgerType }
  disconnected: { id: string; type: LedgerType }
  address: { ledgerID: string; derivationPath: string; address: HexString }
  signedTransaction: SignedEVMTransaction
}

const UnknownLedgerId = "unrecognizable"

const idGeneratorPath = "44'/60'/0'/0/0"

async function requireAvailableLedger() {
  const devs = await navigator.usb.getDevices()

  if (devs.length === 0) {
    throw new Error("No available USB devices to use!")
  }
}

async function deriveAddressOnLedger(path: string, eth: Eth) {
  const a = await eth.getAddress(path)
  const address = eip55.encode(a.address)
  return address
}

async function generateLedgerId(
  transport: Transport,
  eth: Eth
): Promise<[string, LedgerType]> {
  let extensionDeviceType = LedgerType.UNKNOWN

  if (!transport.deviceModel) {
    throw new Error("Missing device model descriptor!")
  }

  switch (transport.deviceModel.id) {
    case DeviceModelId.nanoS:
      extensionDeviceType = LedgerType.LEDGER_NANO_S
      break
    case DeviceModelId.nanoX:
      extensionDeviceType = LedgerType.LEDGER_NANO_X
      break
    default:
      extensionDeviceType = LedgerType.UNKNOWN
  }

  if (extensionDeviceType === LedgerType.UNKNOWN) {
    return [UnknownLedgerId, extensionDeviceType]
  }

  const address = await deriveAddressOnLedger(idGeneratorPath, eth)

  return [address, extensionDeviceType]
}

/**
 * The LedgerService is responsible for
 *
 * The main purpose for this service/layer is
 *
 * The responsibility of this service is 2 fold.
 * - xxx
 */
export default class LedgerService extends BaseService<Events> {
  static create: ServiceCreatorFunction<Events, LedgerService, []> =
    async () => {
      logger.info("LedgerService::create")
      return new this(await getOrCreateDB())
    }

  private constructor(private db: LedgerDatabase) {
    super()
    logger.info("LedgerService::constructor")
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    logger.info("LedgerService::internalStartService")
  }

  async deriveAddress(accountID: string): Promise<HexString> {
    requireAvailableLedger()

    let transport

    try {
      transport = await TransportWebUSB.create()

      const eth = new Eth(transport)

      const [id, type] = await generateLedgerId(transport, eth)

      const accountAddress = await deriveAddressOnLedger(accountID, eth)

      const ethVersion = (await eth.getAppConfiguration()).version

      this.emitter.emit("connected", { id, type })

      this.emitter.emit("ledgerAdded", {
        id,
        type,
        accountIDs: [idGeneratorPath, accountID],
        metadata: { ethereumVersion: ethVersion },
      })

      this.emitter.emit("ledgerAccountAdded", {
        id,
        ledgerID: "",
        derivationPath: accountID,
        addresses: [accountAddress],
      })

      return accountAddress
    } catch (err) {
      // handle transport open error
    } finally {
      if (transport) transport.close()
    }

    throw new Error("Address derivation is unsuccessful!")
  }

  async signTransaction(
    address: HexString,
    transactionRequest: EIP1559TransactionRequest
  ): Promise<SignedEVMTransaction> {
    requireAvailableLedger()

    let transport

    try {
      transport = await TransportWebUSB.create()

      const ethersTx =
        ethersTransactionRequestFromEIP1559TransactionRequest(
          transactionRequest
        )

      const serializedTx = serialize(ethersTx as UnsignedTransaction)

      const accountData = await this.db.getAccountByAddress(address)
      if (!accountData) {
        throw new Error(
          "Cannot generate signature without stored derivation path!"
        )
      }

      const eth = new Eth(transport)
      const signature = await eth.signTransaction(
        accountData.path,
        serializedTx,
        null
      )

      const alteredSig: SignatureLike = {
        r: signature.r,
        s: signature.s,
        v: parseInt(signature.v, 16),
      }

      const signedTransaction = serialize(
        ethersTx as UnsignedTransaction,
        alteredSig
      )
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
        typeof tx.maxPriorityFeePerGas === "undefined" ||
        typeof tx.maxFeePerGas === "undefined" ||
        tx.type !== 2
      ) {
        throw new Error("Can only sign EIP-1559 conforming transactions")
      }

      const signedTx: SignedEVMTransaction = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        nonce: tx.nonce,
        input: tx.data,
        value: tx.value.toBigInt(),
        type: tx.type,
        gasPrice: null,
        maxFeePerGas: tx.maxFeePerGas.toBigInt(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toBigInt(),
        gasLimit: tx.gasLimit.toBigInt(),
        r: tx.r,
        s: tx.s,
        v: tx.v,

        blockHash: null,
        blockHeight: null,
        asset: ETH,
        network: getEthereumNetwork(),
      }

      return signedTx
    } catch (err) {
      // handle transport open error
    } finally {
      if (transport) transport.close()
    }

    throw new Error("Transaction signing is unsuccessful!")
  }

  async signTypedData(
    address: string,
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>
  ): Promise<string> {
    requireAvailableLedger()

    this.signTypedData = this.signTypedData.bind(this)

    throw new Error("Unimplemented")
  }

  async signMessage(address: string, message: string): Promise<string> {
    requireAvailableLedger()

    this.signMessage = this.signMessage.bind(this)

    throw new Error("Unimplemented")
  }
}
