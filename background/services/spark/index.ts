import browser from "webextension-polyfill"
import type { SparkWallet } from "@buildonspark/spark-sdk"
import type { WalletTransfer } from "@buildonspark/spark-sdk/types"

import BaseService from "../base"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import type InternalSignerService from "../internal-signer"
import logger from "../../lib/logger"
import { decodeJSON, encodeJSON } from "../../lib/utils"
import { toSparkAddress } from "../../lib/spark-address"
import {
  SPARK_DEFAULT_ACCOUNT_NUMBER,
  SPARK_NETWORKS_BY_TYPE,
  sparkNetworkByChainID,
} from "../../constants/spark"
import type { SparkNetworkType } from "../../networks"
import type {
  SparkAccount,
  SparkActivityItem,
  SparkActivityKind,
  SparkBalance,
  SparkLightningInvoice,
  SparkSendRequest,
  SparkSendResult,
  SparkServiceErrorCode,
} from "./types"

export * from "./types"

const STORAGE_KEY = "spark/accounts"
const ACTIVITY_PAGE_SIZE = 25

export class SparkServiceError extends Error {
  constructor(
    readonly code: SparkServiceErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = "SparkServiceError"
  }
}

interface Events extends ServiceLifecycleEvents {
  accounts: SparkAccount[]
  balance: SparkBalance
  activity: { accountID: string; items: SparkActivityItem[] }
  walletStatus: {
    accountID: string
    status: "connecting" | "connected" | "disconnected" | "error"
    error?: string
  }
}

type StoredAccount = Omit<SparkAccount, "network"> & { chainID: string }

/**
 * The parts of the internal signer the Spark service relies on: access to
 * recovery phrases while unlocked, and lock-state changes. Spelled out so the
 * dependency on key material stays narrow and visible.
 */
export type SparkKeySource = Pick<
  InternalSignerService,
  "locked" | "getSparkSigner" | "getKeyrings"
> & {
  emitter: Pick<InternalSignerService["emitter"], "on">
}

export function sparkAccountID(
  chainID: string,
  keyringID: string,
  accountNumber: number,
): string {
  return `${chainID}:${keyringID}:${accountNumber}`
}

function activityKind(sdkType: string): SparkActivityKind {
  switch (sdkType) {
    case "TRANSFER":
      return "spark"
    case "PREIMAGE_SWAP":
      return "lightning"
    case "UTXO_SWAP":
      return "deposit"
    case "COOPERATIVE_EXIT":
      return "withdrawal"
    default:
      return "other"
  }
}

export function toActivityItem(
  accountID: string,
  transfer: WalletTransfer,
): SparkActivityItem {
  const direction =
    transfer.transferDirection === "OUTGOING" ? "outgoing" : "incoming"
  const amount =
    direction === "outgoing"
      ? transfer.valueSentByWallet
      : transfer.valueReceivedByWallet

  return {
    id: transfer.id,
    accountID,
    direction,
    kind: activityKind(transfer.type),
    sdkType: transfer.type,
    status: transfer.status,
    amountSats: BigInt(amount ?? transfer.totalValue ?? 0),
    counterpartyIdentityPublicKey:
      direction === "outgoing"
        ? transfer.receiverIdentityPublicKey
        : transfer.senderIdentityPublicKey,
    createdAt: transfer.createdTime?.getTime(),
  }
}

/**
 * Internal activity like leaf swaps and counter-swaps are wallet
 * housekeeping, not payments; don't show them as activity.
 */
function isUserFacingTransfer(transfer: WalletTransfer): boolean {
  return ![
    "SWAP",
    "COUNTER_SWAP",
    "PRIMARY_SWAP_V3",
    "COUNTER_SWAP_V3",
  ].includes(transfer.type)
}

/**
 * The Spark service manages Spark (Bitcoin layer 2) accounts.
 *
 * Spark accounts are derived from recovery phrases already stored in the
 * internal signer's vault. This service never sees a recovery phrase or seed:
 * the internal signer derives the Spark keys and hands out a lock-gated
 * signer (see `InternalSignerService.getSparkSigner`), which the Spark SDK
 * wallet uses for every signing operation. While unlocked, the service keeps
 * one SDK wallet per account, which co-signs with Spark's operators and
 * streams balance updates. On lock, the internal signer drops the derived
 * keys and this service disconnects and drops every SDK wallet. Balances and activity are emitted to Redux, which
 * persists them for display while locked.
 *
 * Spark accounts live alongside, not inside, the EVM account model: they have
 * their own address type (`SparkAddress`), network family (`"SPARK"`) and
 * Redux slice, so none of the EVM-only machinery (chain service, EIP-1193
 * provider, EVM signers) ever sees them.
 */
export default class SparkService extends BaseService<Events> {
  #accounts = new Map<string, SparkAccount>()

  #wallets = new Map<string, Promise<SparkWallet>>()

  /** Unsubscribe functions for SDK event listeners, by account ID. */
  #walletListeners = new Map<string, () => void>()

  static create: ServiceCreatorFunction<
    Events,
    SparkService,
    [Promise<InternalSignerService>]
  > = async (internalSignerService) => new this(await internalSignerService)

  private constructor(private keySource: SparkKeySource) {
    super({
      sparkRefresh: {
        schedule: { periodInMinutes: 1 },
        handler: () => {
          this.refreshAll().catch((error) =>
            logger.warn("Spark refresh failed", error),
          )
        },
      },
    })
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.#loadAccounts()
    this.emitter.emit("accounts", this.getAccounts())

    this.keySource.emitter.on("locked", async (isLocked) => {
      if (isLocked) {
        await this.#disconnectAll()
      } else {
        this.#connectAll()
      }
    })

    if (!this.keySource.locked()) {
      this.#connectAll()
    }
  }

  protected override async internalStopService(): Promise<void> {
    await this.#disconnectAll()
    await super.internalStopService()
  }

  getAccounts(): SparkAccount[] {
    return [...this.#accounts.values()].sort((a, b) => a.addedAt - b.addedAt)
  }

  /**
   * Derive and start tracking a new Spark account from the recovery phrase of
   * an internal-signer keyring. Without an explicit `accountNumber`, uses the
   * SDK's default for the first account on the keyring and the next unused
   * number after that.
   */
  async addAccount({
    keyringID,
    networkType,
    accountNumber: requestedAccountNumber,
  }: {
    keyringID?: string
    networkType: SparkNetworkType
    accountNumber?: number
  }): Promise<SparkAccount> {
    this.#requireUnlocked()

    const resolvedKeyringID = keyringID ?? this.keySource.getKeyrings()[0]?.id
    if (
      resolvedKeyringID === undefined ||
      !this.keySource.getKeyrings().some(({ id }) => id === resolvedKeyringID)
    ) {
      throw new SparkServiceError(
        "unknown-keyring",
        "Spark accounts need a wallet created from a recovery phrase.",
      )
    }

    const network = SPARK_NETWORKS_BY_TYPE[networkType]
    const accountNumber =
      requestedAccountNumber ??
      this.#nextAccountNumber(resolvedKeyringID, networkType)
    const id = sparkAccountID(network.chainID, resolvedKeyringID, accountNumber)

    if (this.#accounts.has(id)) {
      throw new SparkServiceError(
        "duplicate-account",
        "That Spark account has already been added.",
      )
    }

    const wallet = await this.#initializeWallet(
      resolvedKeyringID,
      accountNumber,
      networkType,
    )

    const account: SparkAccount = {
      id,
      keyringID: resolvedKeyringID,
      accountNumber,
      network,
      address: toSparkAddress(await wallet.getSparkAddress(), networkType),
      identityPublicKey: await wallet.getIdentityPublicKey(),
      addedAt: Date.now(),
    }

    this.#accounts.set(id, account)
    this.#wallets.set(id, Promise.resolve(wallet))
    this.#attachListeners(account, wallet)
    await this.#persistAccounts()

    this.emitter.emit("accounts", this.getAccounts())
    this.emitter.emit("walletStatus", { accountID: id, status: "connected" })
    await this.refreshAccount(id)

    return account
  }

  async removeAccount(accountID: string): Promise<void> {
    await this.#disconnect(accountID)
    this.#accounts.delete(accountID)
    await this.#persistAccounts()
    this.emitter.emit("accounts", this.getAccounts())
  }

  /**
   * Remove every Spark account derived from a keyring, e.g. when the keyring
   * itself is removed from the internal signer.
   */
  async removeAccountsForKeyring(keyringID: string): Promise<void> {
    const ids = this.getAccounts()
      .filter((account) => account.keyringID === keyringID)
      .map(({ id }) => id)
    await Promise.all(ids.map((id) => this.removeAccount(id)))
  }

  async refreshAll(): Promise<void> {
    if (this.keySource.locked()) {
      return
    }
    await Promise.all(
      [...this.#accounts.keys()].map((id) =>
        this.refreshAccount(id).catch((error) =>
          logger.warn(`Spark refresh for ${id} failed`, error),
        ),
      ),
    )
  }

  async refreshAccount(accountID: string): Promise<void> {
    const wallet = await this.#walletFor(accountID)
    await Promise.all([
      this.#emitBalance(accountID, wallet),
      this.#emitActivity(accountID, wallet),
    ])
  }

  async getDepositAddress(accountID: string): Promise<string> {
    const wallet = await this.#walletFor(accountID)
    return this.#sdkCall("Getting a deposit address", () =>
      // Static deposit addresses are reusable, which is what a user expects
      // from an address shown on a Receive screen.
      wallet.getStaticDepositAddress(),
    )
  }

  async createLightningInvoice(
    accountID: string,
    amountSats: number,
    memo?: string,
  ): Promise<SparkLightningInvoice> {
    const wallet = await this.#walletFor(accountID)
    const request = await this.#sdkCall("Creating a Lightning invoice", () =>
      wallet.createLightningInvoice({ amountSats, memo }),
    )
    return {
      accountID,
      id: request.id,
      encodedInvoice: request.invoice.encodedInvoice,
      amountSats,
      createdAt: Date.now(),
    }
  }

  async estimateLightningFee(
    accountID: string,
    invoice: string,
    amountSats?: number,
  ): Promise<number> {
    const wallet = await this.#walletFor(accountID)
    return this.#sdkCall("Estimating the Lightning fee", () =>
      wallet.getLightningSendFeeEstimate({
        encodedInvoice: invoice,
        amountSats,
      }),
    )
  }

  /**
   * Send sats. The Spark SDK has no dry-run mode: this moves funds
   * immediately, so callers must confirm with the user first.
   */
  async send(request: SparkSendRequest): Promise<SparkSendResult> {
    const account = this.#accountFor(request.accountID)
    const wallet = await this.#walletFor(request.accountID)

    let result: SparkSendResult
    if (request.kind === "spark") {
      // Re-validate against this account's network: a regtest address must
      // never receive a mainnet transfer or vice versa.
      const receiverSparkAddress = toSparkAddress(
        request.receiverSparkAddress,
        account.network.sparkNetworkType,
      )
      const transfer = await this.#sdkCall("Sending on Spark", () =>
        wallet.transfer({
          receiverSparkAddress,
          amountSats: request.amountSats,
        }),
      )
      result = {
        accountID: account.id,
        id: transfer.id,
        kind: "spark",
        status: transfer.status,
      }
    } else {
      const payment = await this.#sdkCall("Paying the Lightning invoice", () =>
        wallet.payLightningInvoice({
          invoice: request.invoice,
          maxFeeSats: request.maxFeeSats,
          amountSatsToSend: request.amountSats,
          preferSpark: true,
        }),
      )
      result = {
        accountID: account.id,
        id: payment.id,
        kind: "lightning",
        status: String(payment.status),
      }
    }

    this.refreshAccount(account.id).catch((error) =>
      logger.warn("Spark refresh after send failed", error),
    )
    return result
  }

  #requireUnlocked(): void {
    if (this.keySource.locked()) {
      throw new SparkServiceError("locked", "Unlock Taho to use Spark.")
    }
  }

  #accountFor(accountID: string): SparkAccount {
    const account = this.#accounts.get(accountID)
    if (!account) {
      throw new SparkServiceError(
        "unknown-account",
        `Unknown Spark account ${accountID}.`,
      )
    }
    return account
  }

  #nextAccountNumber(keyringID: string, networkType: SparkNetworkType): number {
    const used = this.getAccounts()
      .filter(
        (account) =>
          account.keyringID === keyringID &&
          account.network.sparkNetworkType === networkType,
      )
      .map(({ accountNumber }) => accountNumber)
    if (used.length === 0) {
      return SPARK_DEFAULT_ACCOUNT_NUMBER[networkType]
    }
    return Math.max(...used) + 1
  }

  async #sdkCall<T>(action: string, call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      if (error instanceof SparkServiceError) {
        throw error
      }
      logger.error(`${action} failed`, error)
      const detail = error instanceof Error ? error.message : String(error)
      throw new SparkServiceError("sdk-error", `${action} failed: ${detail}`, {
        cause: error,
      })
    }
  }

  async #initializeWallet(
    keyringID: string,
    accountNumber: number,
    networkType: SparkNetworkType,
  ): Promise<SparkWallet> {
    this.#requireUnlocked()
    const signer = await this.keySource.getSparkSigner({
      keyringID,
      accountNumber,
    })

    // The SDK is large; load it only once a Spark account is actually used.
    const { SparkWallet: SDKWallet } = await import("@buildonspark/spark-sdk")
    const { wallet } = await this.#sdkCall("Connecting to Spark", () =>
      SDKWallet.initialize({
        signer,
        options: {
          network: networkType,
          // Keys are already derived inside the internal signer; the SDK must
          // not ask for (or be given) the seed.
          signerWithPreExistingKeys: true,
        },
      }),
    )
    return wallet
  }

  async #walletFor(accountID: string): Promise<SparkWallet> {
    this.#requireUnlocked()
    const account = this.#accountFor(accountID)
    const existing = this.#wallets.get(accountID)
    if (existing) {
      return existing
    }
    return this.#connect(account)
  }

  #connect(account: SparkAccount): Promise<SparkWallet> {
    this.emitter.emit("walletStatus", {
      accountID: account.id,
      status: "connecting",
    })

    const walletPromise = this.#initializeWallet(
      account.keyringID,
      account.accountNumber,
      account.network.sparkNetworkType,
    ).then(
      (wallet) => {
        this.#attachListeners(account, wallet)
        this.emitter.emit("walletStatus", {
          accountID: account.id,
          status: "connected",
        })
        return wallet
      },
      (error) => {
        this.#wallets.delete(account.id)
        this.emitter.emit("walletStatus", {
          accountID: account.id,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      },
    )

    this.#wallets.set(account.id, walletPromise)
    return walletPromise
  }

  #connectAll(): void {
    this.getAccounts().forEach((account) => {
      this.#connect(account)
        .then(() => this.refreshAccount(account.id))
        .catch((error) =>
          logger.warn(`Connecting Spark account ${account.id} failed`, error),
        )
    })
  }

  #attachListeners(account: SparkAccount, wallet: SparkWallet): void {
    this.#walletListeners.get(account.id)?.()

    const onChange = () => {
      this.refreshAccount(account.id).catch((error) =>
        logger.warn("Spark refresh after event failed", error),
      )
    }
    const events = [
      "balance:update",
      "token-balance:update",
      "transfer:claimed",
      "deposit:confirmed",
    ] as const
    events.forEach((event) => wallet.on(event, onChange))

    this.#walletListeners.set(account.id, () =>
      events.forEach((event) => wallet.off(event, onChange)),
    )
  }

  async #disconnect(accountID: string): Promise<void> {
    this.#walletListeners.get(accountID)?.()
    this.#walletListeners.delete(accountID)

    const walletPromise = this.#wallets.get(accountID)
    this.#wallets.delete(accountID)
    if (!walletPromise) {
      return
    }

    try {
      const wallet = await walletPromise
      await wallet.cleanupConnections()
    } catch (error) {
      logger.warn(`Disconnecting Spark account ${accountID} failed`, error)
    }
    this.emitter.emit("walletStatus", { accountID, status: "disconnected" })
  }

  async #disconnectAll(): Promise<void> {
    await Promise.all(
      [...this.#wallets.keys()].map((id) => this.#disconnect(id)),
    )
  }

  async #emitBalance(accountID: string, wallet: SparkWallet): Promise<void> {
    const { satsBalance, tokenBalances } = await this.#sdkCall(
      "Fetching the Spark balance",
      () => wallet.getBalance(),
    )

    this.emitter.emit("balance", {
      accountID,
      available: satsBalance.available,
      owned: satsBalance.owned,
      incoming: satsBalance.incoming,
      tokens: [...tokenBalances.entries()].map(
        ([
          tokenIdentifier,
          { ownedBalance, availableToSendBalance, tokenMetadata },
        ]) => ({
          tokenIdentifier,
          name: tokenMetadata.tokenName,
          ticker: tokenMetadata.tokenTicker,
          decimals: tokenMetadata.decimals,
          owned: ownedBalance,
          availableToSend: availableToSendBalance,
        }),
      ),
      retrievedAt: Date.now(),
    })
  }

  async #emitActivity(accountID: string, wallet: SparkWallet): Promise<void> {
    const { transfers } = await this.#sdkCall("Fetching Spark activity", () =>
      wallet.getTransfers(ACTIVITY_PAGE_SIZE),
    )
    this.emitter.emit("activity", {
      accountID,
      items: transfers
        .filter(isUserFacingTransfer)
        .map((transfer) => toActivityItem(accountID, transfer)),
    })
  }

  async #loadAccounts(): Promise<void> {
    const { [STORAGE_KEY]: stored } =
      await browser.storage.local.get(STORAGE_KEY)
    if (typeof stored !== "string") {
      return
    }

    try {
      const accounts = decodeJSON(stored) as StoredAccount[]
      accounts.forEach(({ chainID, ...account }) => {
        const network = sparkNetworkByChainID(chainID)
        if (!network) {
          logger.warn(`Dropping Spark account on unknown network ${chainID}`)
          return
        }
        this.#accounts.set(account.id, {
          ...account,
          address: toSparkAddress(account.address, network.sparkNetworkType),
          network,
        })
      })
    } catch (error) {
      logger.error("Failed to load stored Spark accounts", error)
    }
  }

  async #persistAccounts(): Promise<void> {
    const stored: StoredAccount[] = this.getAccounts().map(
      ({ network, ...account }) => ({ ...account, chainID: network.chainID }),
    )
    await browser.storage.local.set({ [STORAGE_KEY]: encodeJSON(stored) })
  }
}
