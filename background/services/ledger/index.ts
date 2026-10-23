import Transport from "@ledgerhq/hw-transport"
import Eth from "@ledgerhq/hw-app-eth"
import { DeviceModelId, identifyUSBProductId } from "@ledgerhq/devices"
import {
  serialize,
  UnsignedTransaction,
  parse as parseRawTransaction,
} from "@ethersproject/transactions"
import {
  joinSignature,
  _TypedDataEncoder,
  getAddress as ethersGetAddress,
} from "ethers/lib/utils"
import {
  isEIP1559TransactionRequest,
  isKnownTxType,
  SignedTransaction,
  TransactionRequestWithNonce,
} from "../../networks"
import type { EIP712TypedData, HexString } from "../../types"
import BaseService from "../base"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import logger from "../../lib/logger"
import { getOrCreateDB, LedgerAccount, LedgerDatabase } from "./db"
import openConnectedLedgerTransport from "./transport"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"
import { ETHEREUM } from "../../constants"
import { normalizeEVMAddress } from "../../lib/utils"
import type { AddressOnNetwork } from "../../accounts"

enum LedgerType {
  UNKNOWN,
  LEDGER_NANO_S,
  LEDGER_NANO_X,
  LEDGER_NANO_X_1,
  LEDGER_NANO_S_PLUS,
  LEDGER_STAX,
  LEDGER_FLEX,
}

const LedgerTypeAsString = Object.values(LedgerType)

export type LedgerAccountSigner = {
  type: "ledger"
  deviceID: string
  path: string
}

export const isLedgerSupported = typeof navigator.usb === "object"

type USBConnectionHandler = (event: USBConnectionEvent) => Promise<void>

/**
 * Manifest V3 only delivers events to a background service worker's
 * listeners if they were added during the worker script's initial
 * evaluation; Chrome warns about, and won't wake the worker for, listeners
 * added later. LedgerService is created after asynchronous setup, so the
 * navigator.usb listeners are added here, when the module is evaluated, and
 * forward each event to whichever handlers the service has attached.
 */
const usbConnectHandlers = new Set<USBConnectionHandler>()
const usbDisconnectHandlers = new Set<USBConnectionHandler>()

if (isLedgerSupported) {
  navigator.usb.addEventListener("connect", (event) => {
    usbConnectHandlers.forEach((handler) => handler(event))
  })
  navigator.usb.addEventListener("disconnect", (event) => {
    usbDisconnectHandlers.forEach((handler) => handler(event))
  })
}

const TestedProductId = (productId: number): boolean =>
  identifyUSBProductId(productId) != null

/**
 * Metadata details about the display of a given Ledger device.
 */
export type DisplayDetails = {
  /**
   * When confirming a message for signing, the length of the message that the
   * Ledger will display before cutting it off.
   */
  messageSigningDisplayLength: number
}

const DisplayDetailsByLedgerType: {
  [ledgerType in LedgerType]: DisplayDetails
} = {
  [LedgerType.UNKNOWN]: { messageSigningDisplayLength: 0 },
  [LedgerType.LEDGER_NANO_S]: { messageSigningDisplayLength: 99 },
  [LedgerType.LEDGER_NANO_X]: { messageSigningDisplayLength: 255 },
  [LedgerType.LEDGER_NANO_X_1]: { messageSigningDisplayLength: 255 },
  [LedgerType.LEDGER_NANO_S_PLUS]: { messageSigningDisplayLength: 255 },
  [LedgerType.LEDGER_STAX]: { messageSigningDisplayLength: 255 },
  [LedgerType.LEDGER_FLEX]: { messageSigningDisplayLength: 255 },
}

type MetaData = {
  ethereumVersion: string
  isArbitraryDataSigningEnabled: boolean
  displayDetails: DisplayDetails
}

export type ConnectedDevice = {
  id: string
  type: LedgerType
  metadata: MetaData
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
  connected: ConnectedDevice
  disconnected: { id: string; type: LedgerType }
  address: { ledgerID: string; derivationPath: string; address: HexString }
  signedTransaction: SignedTransaction
  signedData: string
  usbDeviceCount: number
}

export const idDerivationPath = "44'/60'/0'/0/0"

async function deriveAddressOnLedger(path: string, eth: Eth) {
  const derivedIdentifiers = await eth.getAddress(path)
  const address = ethersGetAddress(derivedIdentifiers.address)
  return address
}

/**
 * Whether the Ledger currently has the Ethereum app open, using the
 * dashboard-level GET APP NAME command (CLA 0xb0, INS 0x01).
 *
 * Adapted from @ledgerhq/live-common.
 */
async function isEthereumAppOpen(transport: Transport): Promise<boolean> {
  const response = await transport.send(0xb0, 0x01, 0x00, 0x00)

  const format = response[0]
  if (format !== 1) {
    return false
  }

  const nameLength = response[1]
  const name = response.subarray(2, 2 + nameLength).toString("ascii")

  return name === "Ethereum"
}

/**
 * How often, and for how long, the service polls a Ledger that's plugged in
 * but locked or not on the Ethereum app. Unlocking the device and opening or
 * quitting apps fire no USB events, so polling is the only way to notice
 * them. Polling starts fast, while the user is most likely busy with the
 * device, slows down after a while, and stops a while after the last
 * plug-in or refresh.
 */
export const READINESS_POLL_FAST_INTERVAL_MS = 1_000
export const READINESS_POLL_FAST_PERIOD_MS = 30_000
export const READINESS_POLL_SLOW_INTERVAL_MS = 3_000
export const READINESS_POLL_DURATION_MS = 120_000

/**
 * Sorts an error from talking to the Ledger into whether the Ledger just
 * isn't ready yet (locked, on the dashboard or another app, or busy), has
 * gone away, or failed some other way. Ledger errors are matched by name,
 * since hw-transport and the app packages can each bring their own copy of
 * @ledgerhq/errors.
 */
function classifyLedgerError(error: unknown): "not-ready" | "gone" | "failed" {
  const name =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : undefined

  switch (name) {
    case "LockedDeviceError":
    case "TransportStatusError":
    case "TransportRaceCondition":
      return "not-ready"
    case "DisconnectedDevice":
    case "DisconnectedDeviceDuringOperation":
    case "TransportInterfaceNotAvailable":
    case "NotFoundError":
      return "gone"
    default:
      return "failed"
  }
}

async function generateLedgerId(
  transport: Transport,
  eth: Eth,
): Promise<[string | undefined, LedgerType]> {
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
    case DeviceModelId.nanoSP:
      extensionDeviceType = LedgerType.LEDGER_NANO_S_PLUS
      break
    case DeviceModelId.stax:
      extensionDeviceType = LedgerType.LEDGER_STAX
      break
    case DeviceModelId.europa:
      extensionDeviceType = LedgerType.LEDGER_FLEX
      break
    default:
      extensionDeviceType = LedgerType.UNKNOWN
  }

  if (extensionDeviceType === LedgerType.UNKNOWN) {
    return [undefined, extensionDeviceType]
  }

  const address = await deriveAddressOnLedger(idDerivationPath, eth)

  return [address, extensionDeviceType]
}

/**
 * The LedgerService is responsible for exposing the functionality of
 * Ledger devices in a digestible form by other services
 *
 * To do so, it does:
 *   - serialize the calls to the critical resource (ie. Ledger)
 *   - acts when a paired device is (dis-)connected
 *   - supports address derivation from BIP32 paths
 *   - supports transaction signing
 *   - supports typed data signing
 *   - maps the successfully onboarded addresses to their derivation paths
 *
 * Known issues
 *   - this service's kryptonite is having multiple browser-paired Ledgers
 *     connected to the computer. In that case the Wallet doesn't know
 *     which device will respond to its requests
 */
export default class LedgerService extends BaseService<Events> {
  /**
   * The connected Ledger's id and type, which are always set and cleared
   * together.
   */
  #currentLedger: { id: string; type: LedgerType } | null = null

  transport: Transport | undefined = undefined

  /**
   * The USB device the current transport was opened on, used to tell whether
   * a USB disconnect is the Ledger going away or some other device.
   */
  #currentDevice: USBDevice | undefined = undefined

  /**
   * Set while the transport is open on a Ledger that's locked or not on the
   * Ethereum app, and the service is polling it until it's ready. Polling is
   * private to the service: until the Ledger is ready, it looks just as it
   * did before polling existed, disconnected.
   */
  #readinessPoll: {
    /** When polling was last started or extended by a plug-in or refresh. */
    triggeredAt: number
    timer: ReturnType<typeof setTimeout> | undefined
  } | null = null

  #lastOperationPromise = Promise.resolve()

  static create: ServiceCreatorFunction<Events, LedgerService, []> = async () =>
    new this(await getOrCreateDB())

  private constructor(private db: LedgerDatabase) {
    super()

    usbConnectHandlers.add(this.#handleUSBConnect)
    usbDisconnectHandlers.add(this.#handleUSBDisconnect)

    // Block serial operations until the service is started, in case a
    // connection or disconnection event occurs to soon.
    this.#lastOperationPromise = this.started().then(() => {})
  }

  private runSerialized<T>(operation: () => Promise<T>) {
    const oldOperationPromise = this.#lastOperationPromise
    const newOperationPromise = oldOperationPromise.then(async () =>
      operation(),
    )

    this.#lastOperationPromise = newOperationPromise.then(
      () => {},
      () => {},
    )

    return newOperationPromise
  }

  async onConnection(productId: number): Promise<void> {
    return this.runSerialized(async () => {
      if (!TestedProductId(productId)) {
        return
      }

      try {
        // A transport left open keeps its USB interface claimed, which makes
        // creating the next one fail with "Unable to claim interface".
        await this.#closeTransport("replacing")

        // Only a Ledger the browser has already paired can be opened from
        // the background; pairing a new one needs a user gesture in a page.
        const transport = await openConnectedLedgerTransport()
        if (transport === null) {
          this.#stopReadinessPolling()
          return
        }
        this.transport = transport
        this.#currentDevice = transport.device
      } catch (error) {
        this.#stopReadinessPolling()
        await this.#handleConnectionError(error)
        return
      }

      await this.#connectWhenReady(true)
    })
  }

  /**
   * Connects to the Ledger on the open transport if it's unlocked and on the
   * Ethereum app, and otherwise keeps the transport open and polls until it
   * is. `trigger` is true for a plug-in or refresh, which starts polling or
   * extends its deadline, and false for a poll. Must run serialized.
   */
  async #connectWhenReady(trigger: boolean): Promise<void> {
    const { transport } = this
    if (transport === undefined) {
      this.#stopReadinessPolling()
      return
    }

    try {
      if (await isEthereumAppOpen(transport)) {
        await this.#completeConnection(transport)
        if (this.#readinessPoll !== null) {
          logger.info("Ledger is now unlocked with the Ethereum app open.")
        }
        this.#stopReadinessPolling()
        return
      }
    } catch (error) {
      if (classifyLedgerError(error) !== "not-ready") {
        this.#stopReadinessPolling()
        await this.#handleConnectionError(error)
        return
      }
      logger.debug("Ledger isn't ready:", error)
    }

    await this.#waitForReadiness(trigger)
  }

  /**
   * Finishes connecting to a Ledger with the Ethereum app open, identifying
   * it and announcing it as connected (and as added, if it's new).
   */
  async #completeConnection(transport: Transport): Promise<void> {
    const eth = new Eth(transport)

    const [id, type] = await generateLedgerId(transport, eth)

    if (!id) {
      throw new Error("Can't derive meaningful identification address!")
    }

    const appData = await eth.getAppConfiguration()

    const normalizedID = normalizeEVMAddress(id)

    const ledgerId = `${LedgerTypeAsString[type]}_${normalizedID}`
    this.#currentLedger = { id: ledgerId, type }

    this.emitter.emit("connected", {
      id: ledgerId,
      type,
      metadata: {
        ethereumVersion: appData.version,
        isArbitraryDataSigningEnabled: appData.arbitraryDataEnabled !== 0,
        displayDetails: DisplayDetailsByLedgerType[type],
      },
    })

    const knownAddresses = await this.db.getAllAccountsByLedgerId(ledgerId)

    if (!knownAddresses.length) {
      this.emitter.emit("ledgerAdded", {
        id: ledgerId,
        type,
        accountIDs: [idDerivationPath],
        metadata: {
          ethereumVersion: appData.version,
          isArbitraryDataSigningEnabled: appData.arbitraryDataEnabled !== 0,
          displayDetails: DisplayDetailsByLedgerType[type],
        },
      })
    }
  }

  /**
   * Treats the Ledger as disconnected after an error connecting to it,
   * closing the transport. A Ledger that went away mid-connection is
   * expected and only logged at info level.
   */
  async #handleConnectionError(error: unknown): Promise<void> {
    if (classifyLedgerError(error) === "gone") {
      logger.info("Ledger went away while connecting:", error)
    } else {
      logger.error(
        "Treating Ledger as having disconnected due to a connection error:",
        error,
      )
    }
    await this.#closeTransport("failed-connection")
    await this.#handleUSBDisconnect()
  }

  /**
   * Keeps polling a Ledger that isn't ready yet, starting polling if
   * `trigger` is set and it isn't running, and resetting the deadline on
   * every trigger. A Ledger that was connected until now is reported as
   * disconnected, as a failed connection attempt always did. Once the
   * deadline passes, polling stops and the transport is closed quietly. Must
   * run serialized.
   */
  async #waitForReadiness(trigger: boolean): Promise<void> {
    const currentLedger = this.#currentLedger
    if (currentLedger !== null) {
      this.#currentLedger = null
      void this.emitter.emit("disconnected", {
        id: currentLedger.id,
        type: currentLedger.type,
      })
    }

    if (this.transport === undefined) {
      // The Ledger was unplugged while it was being checked.
      this.#stopReadinessPolling()
      return
    }

    let poll = this.#readinessPoll
    if (poll === null) {
      if (!trigger) {
        // Polling was stopped while this poll was in flight.
        return
      }
      logger.info(
        "Ledger is locked or not on the Ethereum app; waiting for it to be ready.",
      )
      poll = { triggeredAt: Date.now(), timer: undefined }
      this.#readinessPoll = poll
    } else if (trigger) {
      poll.triggeredAt = Date.now()
    }

    const elapsed = Date.now() - poll.triggeredAt
    if (elapsed >= READINESS_POLL_DURATION_MS) {
      logger.info(
        "Ledger didn't become ready in time; closing its transport until it's plugged in or refreshed.",
      )
      this.#stopReadinessPolling()
      await this.#closeTransport("timed-out")
      return
    }

    clearTimeout(poll.timer)
    poll.timer = setTimeout(
      () => {
        void this.runSerialized(async () => {
          const currentPoll = this.#readinessPoll
          if (currentPoll === null) {
            return
          }
          currentPoll.timer = undefined
          logger.debug("Polling Ledger readiness.")
          await this.#connectWhenReady(false)
        })
      },
      elapsed < READINESS_POLL_FAST_PERIOD_MS
        ? READINESS_POLL_FAST_INTERVAL_MS
        : READINESS_POLL_SLOW_INTERVAL_MS,
    )
  }

  #stopReadinessPolling(): void {
    clearTimeout(this.#readinessPoll?.timer)
    this.#readinessPoll = null
  }

  /**
   * Closes the current transport, if there is one. Closing releases the USB
   * interface, which fails once the device is unplugged, so failures are
   * expected when replacing a possibly stale transport or after a disconnect
   * and only logged at debug level, as they are when giving up on a Ledger
   * that never became ready. A failure to close after a failed
   * connection attempt is unexpected, and warns.
   */
  async #closeTransport(
    reason: "replacing" | "disconnected" | "failed-connection" | "timed-out",
  ): Promise<void> {
    const { transport } = this
    if (transport === undefined) {
      return
    }

    this.transport = undefined
    this.#currentDevice = undefined

    try {
      await transport.close()
    } catch (error) {
      if (reason === "failed-connection") {
        logger.warn("Failed to close Ledger transport:", error)
      } else {
        logger.debug(`Failed to close Ledger transport (${reason}):`, error)
      }
    }
  }

  #handleUSBConnect = async (event: USBConnectionEvent): Promise<void> => {
    this.emitter.emit(
      "usbDeviceCount",
      (await navigator.usb.getDevices()).length,
    )
    if (!TestedProductId(event.device.productId)) {
      return
    }

    this.onConnection(event.device.productId)
  }

  /**
   * Handles a USB device going away, or a failed connection when called with
   * no event. A disconnect only disconnects the Ledger when it's the device
   * the transport was opened on; other USB devices, including other Ledgers,
   * coming and going don't affect it. WebUSB uses a single USBDevice object
   * per device, so the event's device can be compared directly. Either way,
   * readiness polling stops; a Ledger that was still being polled was never
   * reported as connected, so its transport is closed without a
   * `disconnected` event.
   */
  #handleUSBDisconnect = async (event?: USBConnectionEvent): Promise<void> => {
    this.emitter.emit(
      "usbDeviceCount",
      (await navigator.usb.getDevices()).length,
    )
    if (
      event !== undefined &&
      this.#currentDevice !== undefined &&
      event.device !== this.#currentDevice
    ) {
      return
    }

    const wasPolling = this.#readinessPoll !== null
    this.#stopReadinessPolling()

    const currentLedger = this.#currentLedger
    if (currentLedger === null) {
      if (wasPolling) {
        logger.info("Ledger was unplugged before it became ready.")
        await this.#closeTransport("disconnected")
      }
      return
    }

    await this.#closeTransport("disconnected")

    this.emitter.emit("disconnected", {
      id: currentLedger.id,
      type: currentLedger.type,
    })

    this.#currentLedger = null
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    this.refreshConnectedLedger()
  }

  protected override async internalStopService(): Promise<void> {
    await super.internalStopService() // Not needed, but better to stick to the patterns

    usbDisconnectHandlers.delete(this.#handleUSBDisconnect)
    usbConnectHandlers.delete(this.#handleUSBConnect)
    this.#stopReadinessPolling()
  }

  async refreshConnectedLedger(): Promise<string | null> {
    const usbDeviceArray = await navigator.usb.getDevices()

    this.emitter.emit("usbDeviceCount", usbDeviceArray.length)

    if (usbDeviceArray.length === 0 || usbDeviceArray.length > 1) {
      return null // Nasty things may happen when we've got zero or multiple choices
    }

    if (usbDeviceArray.length === 1) {
      await this.onConnection(usbDeviceArray[0].productId)
    }

    return this.#currentLedger?.id ?? null
  }

  async deriveAddress({
    // FIXME Use deviceID.
    path: derivationPath,
  }: LedgerAccountSigner): Promise<HexString> {
    return this.runSerialized(async () => {
      try {
        if (!this.transport) {
          throw new Error("Uninitialized transport!")
        }

        const currentLedger = this.#currentLedger
        if (currentLedger === null) {
          throw new Error("Uninitialized Ledger ID!")
        }

        const eth = new Eth(this.transport)

        const accountAddress = normalizeEVMAddress(
          await deriveAddressOnLedger(derivationPath, eth),
        )

        this.emitter.emit("address", {
          ledgerID: currentLedger.id,
          derivationPath,
          address: accountAddress,
        })

        return accountAddress
      } catch (err) {
        logger.error(
          `Error encountered deriving address at path ${derivationPath}! ledgerID: ${
            this.#currentLedger?.id ?? null
          } error: ${err}`,
        )
        throw err
      }
    })
  }

  async saveAddress(path: HexString, address: string): Promise<void> {
    const currentLedger = this.#currentLedger
    if (currentLedger === null) {
      throw new Error("No Ledger id is set!")
    }

    await this.db.addAccount({ ledgerId: currentLedger.id, path, address })
  }

  async removeAddress(address: HexString): Promise<void> {
    await this.db.removeAccount(address)
  }

  async getAccountByAddress(address: HexString): Promise<LedgerAccount | null> {
    const ledgerAccount = await this.db.getAccountByAddress(address)
    return ledgerAccount
  }

  async signTransaction(
    transactionRequest: TransactionRequestWithNonce,
    { deviceID, path: derivationPath }: LedgerAccountSigner,
  ): Promise<SignedTransaction> {
    return this.runSerialized(async () => {
      try {
        if (!this.transport) {
          throw new Error("Uninitialized transport!")
        }

        if (this.#currentLedger === null) {
          throw new Error("Uninitialized Ledger ID!")
        }

        const ethersTx =
          ethersTransactionFromTransactionRequest(transactionRequest)

        let serializableEthersTx = ethersTx

        if (!isEIP1559TransactionRequest(ethersTx)) {
          // Ethers does not permit "from" field when serializing legacy transaction requests
          const { from: _, ...fieldsWithoutFrom } = ethersTx
          serializableEthersTx = fieldsWithoutFrom
        }

        const serializedTx = serialize(
          serializableEthersTx as UnsignedTransaction,
        ).substring(2) // serialize adds 0x prefix which kills Eth::signTransaction

        const accountData = await this.db.getAccountByAddress(
          transactionRequest.from,
        )

        this.checkCanSign(accountData, derivationPath, deviceID)

        const eth = new Eth(this.transport)
        const signature = await eth.signTransaction(
          derivationPath,
          serializedTx,
          null,
        )

        const signedTransaction = serialize(
          serializableEthersTx as UnsignedTransaction,
          {
            r: `0x${signature.r}`,
            s: `0x${signature.s}`,
            v: parseInt(signature.v, 16),
          },
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

        if (tx.type !== null && !isKnownTxType(tx.type)) {
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
        } as const // narrow types for compatibility with our internal ones

        return signedTx
      } catch (err) {
        logger.error(
          `Error encountered! ledgerID: ${
            this.#currentLedger?.id ?? null
          } transactionRequest: ${transactionRequest} error: ${err}`,
        )

        throw err
      }
    })
  }

  async signTypedData(
    typedData: EIP712TypedData,
    account: HexString,
    { deviceID, path: derivationPath }: LedgerAccountSigner,
  ): Promise<string> {
    return this.runSerialized(async () => {
      if (!this.transport) {
        throw new Error("Uninitialized transport!")
      }

      if (this.#currentLedger === null) {
        throw new Error("Uninitialized Ledger ID!")
      }

      const eth = new Eth(this.transport)
      const { EIP712Domain: _, ...typesForSigning } = typedData.types
      const hashedDomain = _TypedDataEncoder.hashDomain(typedData.domain)
      const hashedMessage = _TypedDataEncoder
        .from(typesForSigning)
        .hash(typedData.message)

      const accountData = await this.db.getAccountByAddress(account)

      this.checkCanSign(accountData, derivationPath, deviceID)

      const signature = await eth.signEIP712HashedMessage(
        derivationPath,
        hashedDomain,
        hashedMessage,
      )

      this.emitter.emit(
        "signedData",
        joinSignature({
          r: `0x${signature.r}`,
          s: `0x${signature.s}`,
          v: signature.v,
        }),
      )

      return joinSignature({
        r: `0x${signature.r}`,
        s: `0x${signature.s}`,
        v: signature.v,
      })
    })
  }

  private checkCanSign(
    accountData: LedgerAccount | null,
    path: string,
    deviceID: string,
  ) {
    if (
      !accountData ||
      path !== accountData.path ||
      deviceID !== accountData.ledgerId
    ) {
      throw new Error("Signing method mismatch!")
    }

    if (deviceID !== this.#currentLedger?.id) {
      throw new Error("Cannot sign on wrong device attached!")
    }
  }

  async signMessage(
    { address, network }: AddressOnNetwork,
    hexDataToSign: HexString,
  ): Promise<string> {
    // Currently the service assumes the Eth app, which requires a network that
    // uses the same derivation path as Ethereum, or one that starts with the
    // same components.
    // FIXME This should take a `LedgerAccountSigner` and use `checkCanSign`
    // FIXME like other signing methods.
    if (
      network.derivationPath !== ETHEREUM.derivationPath &&
      !network.derivationPath?.startsWith(ETHEREUM.derivationPath ?? "")
    ) {
      throw new Error("Unsupported network for Ledger signing")
    }

    if (!this.transport) {
      throw new Error("Uninitialized transport!")
    }

    if (this.#currentLedger === null) {
      throw new Error("Uninitialized Ledger ID!")
    }

    const accountData = await this.db.getAccountByAddress(address)

    if (!accountData) {
      throw new Error(
        `Address "${address}" doesn't have corresponding derivation path!`,
      )
    }

    const eth = new Eth(this.transport)

    const signature = await eth.signPersonalMessage(
      accountData.path,
      // Ledger requires unprefixed hex, so make sure that's what we pass.
      hexDataToSign.replace(/^0x/, ""),
    )

    const signatureHex = joinSignature({
      r: `0x${signature.r}`,
      s: `0x${signature.s}`,
      v: signature.v,
    })
    this.emitter.emit("signedData", signatureHex)

    return signatureHex
  }
}
