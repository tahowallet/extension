import { Runtime } from "webextension-polyfill"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { utils } from "ethers"

import {
  isProbablyEVMAddress,
  normalizeEVMAddress,
  sameEVMAddress,
  wait,
} from "../../lib/utils"

import {
  BaseService,
  ChainService,
  EnrichmentService,
  IndexingService,
  InternalEthereumProviderService,
  InternalSignerService,
  NameService,
  PreferenceService,
  ProviderBridgeService,
  TelemetryService,
  ServiceCreatorFunction,
  IslandService,
  LedgerService,
  SigningService,
  NFTsService,
  AnalyticsService,
} from ".."

import { HexString, NormalizedEVMAddress } from "../../types"
import { SignedTransaction, sameNetwork } from "../../networks"
import { AccountBalance, AddressOnNetwork, NameOnNetwork } from "../../accounts"
import { Eligible, ReferrerStats } from "../island/types"

import {
  AccountType,
  deleteAccount,
  loadAccount,
  updateAccountBalance,
  updateAccountName,
  updateAccountAssetReferences,
  updateENSAvatar,
} from "../../redux-slices/accounts"
import {
  assetsLoaded,
  refreshAsset,
  removeAssetData,
} from "../../redux-slices/assets"
import {
  addIslandAsset,
  clearIslandAssets,
  setEligibility,
  setEligibilityLoading,
  setReferrer,
  setReferrerStats,
} from "../../redux-slices/claim"
import { FeatureFlags, isDisabled } from "../../features"
import {
  emitter as internalSignerSliceEmitter,
  internalSignerLocked,
  internalSignerUnlocked,
  updateInternalSigners,
  setKeyringToVerify,
} from "../../redux-slices/internal-signer"
import { blockSeen, setEVMNetworks } from "../../redux-slices/networks"
import {
  initializationLoadingTimeHitLimit,
  emitter as uiSliceEmitter,
  setDefaultWallet,
  setSelectedAccount,
  setNewSelectedAccount,
  setSnackbarMessage,
  setAccountsSignerSettings,
  toggleCollectAnalytics,
  setShowAnalyticsNotification,
  setSelectedNetwork,
  setAutoLockInterval,
  toggleNotifications,
  setShownDismissableItems,
  dismissableItemMarkedAsShown,
  toggleTestNetworks,
  updateCampaignsState,
} from "../../redux-slices/ui"
import {
  estimatedFeesPerGas,
  emitter as transactionConstructionSliceEmitter,
  transactionRequest,
  updateTransactionData,
  clearTransactionState,
  TransactionConstructionStatus,
  rejectTransactionSignature,
  transactionSigned,
  clearCustomGas,
  updateRollupEstimates,
} from "../../redux-slices/transaction-construction"
import { selectDefaultNetworkFeeSettings } from "../../redux-slices/selectors/transactionConstructionSelectors"
import {
  requestPermission,
  emitter as providerBridgeSliceEmitter,
  initializePermissions,
  revokePermissionsForAddress,
  setCurrentNetworkForOrigin,
} from "../../redux-slices/dapp"
import logger from "../../lib/logger"
import {
  rejectDataSignature,
  clearSigningState,
  signedTypedData,
  signedData as signedDataAction,
  signingSliceEmitter,
  typedDataRequest,
  signDataRequest,
} from "../../redux-slices/signing"

import {
  SignTypedDataRequest,
  MessageSigningRequest,
} from "../../utils/signing"
import {
  emitter as earnSliceEmitter,
  setVaultsAsStale,
} from "../../redux-slices/earn"
import {
  removeDevice,
  resetLedgerState,
  setDeviceConnectionStatus,
  setUsbDeviceCount,
} from "../../redux-slices/ledger"
import {
  ETHEREUM,
  FLASHBOTS_RPC_URL,
  OPTIMISM,
  POPUP_MONITOR_PORT_NAME,
  USD,
} from "../../constants"
import {
  clearApprovalInProgress,
  clearSwapQuote,
} from "../../redux-slices/0x-swap"
import {
  AccountSigner,
  SignatureResponse,
  TXSignatureResponse,
} from "../signing"
import { PermissionMap } from "../provider-bridge/utils"
import { TAHO_INTERNAL_ORIGIN } from "../internal-ethereum-provider/constants"
import {
  ActivityDetail,
  addActivity,
  initializeActivities,
  initializeActivitiesForAccount,
  removeActivities,
} from "../../redux-slices/activities"
import { selectActivitesHashesForEnrichment } from "../../redux-slices/selectors"
import { getActivityDetails } from "../../redux-slices/utils/activities-utils"
import { getRelevantTransactionAddresses } from "../enrichment/utils"
import { AccountSignerWithId } from "../../signing"
import {
  AnyAssetMetadata,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
} from "../../assets"
import { NFTCollection } from "../../nfts"
import {
  initializeNFTs,
  updateNFTsCollections,
  emitter as nftsSliceEmitter,
  updateNFTs,
  deleteNFTsForAddress,
  updateIsReloading,
  deleteTransferredNFTs,
} from "../../redux-slices/nfts"
import AbilitiesService from "../abilities"
import {
  setAbilitiesForAddress,
  updateAbility,
  addAccount as addAccountFilter,
  deleteAccount as deleteAccountFilter,
  deleteAbilitiesForAccount,
  initAbilities,
} from "../../redux-slices/abilities"
import { AddChainRequestData } from "../provider-bridge"
import {
  AnalyticsEvent,
  isOneTimeAnalyticsEvent,
  OneTimeAnalyticsEvent,
} from "../../lib/posthog"
import {
  isBaseAssetForNetwork,
  isSameAsset,
} from "../../redux-slices/utils/asset-utils"
import { SignerImportMetadata, SignerInternalTypes } from "../internal-signer"
import { getPricePoint, getTokenPrices } from "../../lib/prices"
import { makeFlashbotsProviderCreator } from "../chain/serial-fallback-provider"
import { AnalyticsPreferences, DismissableItem } from "../preferences"
import {
  newPricePoints,
  updatePriceAssetReferences,
} from "../../redux-slices/prices"
import NotificationsService from "../notifications"
import { ReduxStoreType, initializeStore, readAndMigrateState } from "./store"
import CampaignService from "../campaign"
import { DAPP_BASE_URL } from "../campaign/matsnet-nft"

export default class ReduxService extends BaseService<never> {
  /**
   * The redux store for the wallet core. Note that the redux store is used to
   * render the UI (via webext-redux), but it is _not_ the source of truth.
   * Services interact with the various external and internal components and
   * create persisted state, and the redux store is simply a view onto those
   * pieces of canonical state.
   */
  store: ReduxStoreType

  static create: ServiceCreatorFunction<never, ReduxService, []> = async () => {
    const preferenceService = PreferenceService.create()

    const internalSignerService =
      InternalSignerService.create(preferenceService)
    const chainService = ChainService.create(
      preferenceService,
      internalSignerService,
    )
    const indexingService = IndexingService.create(
      preferenceService,
      chainService,
    )
    const nameService = NameService.create(chainService, preferenceService)
    const enrichmentService = EnrichmentService.create(
      chainService,
      indexingService,
      nameService,
    )
    const internalEthereumProviderService =
      InternalEthereumProviderService.create(chainService, preferenceService)
    const providerBridgeService = ProviderBridgeService.create(
      internalEthereumProviderService,
      preferenceService,
    )

    const notificationsService = NotificationsService.create(preferenceService)

    const islandService = IslandService.create(chainService, indexingService)

    const telemetryService = TelemetryService.create()

    const ledgerService = LedgerService.create()

    const signingService = SigningService.create(
      internalSignerService,
      ledgerService,
      chainService,
    )

    const analyticsService = AnalyticsService.create(
      internalSignerService,
      signingService,
      preferenceService,
    )

    const nftsService = NFTsService.create(chainService)

    const abilitiesService = AbilitiesService.create(
      chainService,
      ledgerService,
    )

    const campaignService = CampaignService.create(
      chainService,
      analyticsService,
      preferenceService,
      enrichmentService,
      notificationsService,
    )

    const savedReduxState = readAndMigrateState()

    return new this(
      await savedReduxState,
      await preferenceService,
      await chainService,
      await enrichmentService,
      await indexingService,
      await internalSignerService,
      await nameService,
      await internalEthereumProviderService,
      await providerBridgeService,
      await islandService,
      await telemetryService,
      await ledgerService,
      await signingService,
      await analyticsService,
      await nftsService,
      await abilitiesService,
      await notificationsService,
      await campaignService,
    )
  }

  private constructor(
    savedReduxState: Record<string, unknown>,
    /**
     * A promise to the preference service, a dependency for most other services.
     * The promise will be resolved when the service is initialized.
     */
    private preferenceService: PreferenceService,
    /**
     * A promise to the chain service, keeping track of base asset balances,
     * transactions, and network status. The promise will be resolved when the
     * service is initialized.
     */
    private chainService: ChainService,
    /**
     *
     */
    private enrichmentService: EnrichmentService,
    /**
     * A promise to the indexing service, keeping track of token balances and
     * prices. The promise will be resolved when the service is initialized.
     */
    private indexingService: IndexingService,
    /**
     * A promise to the internal signer service, which stores key material, derives
     * accounts, and signs messages and transactions. The promise will be
     * resolved when the service is initialized.
     */
    private internalSignerService: InternalSignerService,
    /**
     * A promise to the name service, responsible for resolving names to
     * addresses and content.
     */
    private nameService: NameService,
    /**
     * A promise to the internal ethereum provider service, which acts as
     * web3 / ethereum provider for the internal and external dApps to use.
     */
    private internalEthereumProviderService: InternalEthereumProviderService,
    /**
     * A promise to the provider bridge service, handling and validating
     * the communication coming from dApps according to EIP-1193 and some tribal
     * knowledge.
     */
    private providerBridgeService: ProviderBridgeService,
    /**
     * A promise to the claim service, which saves the eligibility data
     * for efficient storage and retrieval.
     */
    private islandService: IslandService,
    /**
     * A promise to the telemetry service, which keeps track of extension
     * storage usage and (eventually) other statistics.
     */
    private telemetryService: TelemetryService,

    /**
     * A promise to the Ledger service, handling the communication
     * with attached Ledger device according to ledgerjs examples and some
     * tribal knowledge. ;)
     */
    private ledgerService: LedgerService,

    /**
     * A promise to the signing service which will route operations between the UI
     * and the exact signing services.
     */
    private signingService: SigningService,

    /**
     * A promise to the analytics service which will be responsible for listening
     * to events and dispatching to our analytics backend
     */
    private analyticsService: AnalyticsService,

    /**
     * A promise to the NFTs service which takes care of NFTs data, fetching, updating
     * details and prices of NFTs for imported accounts.
     */
    private nftsService: NFTsService,

    /**
     * A promise to the Abilities service which takes care of fetching and storing abilities
     */
    private abilitiesService: AbilitiesService,

    /**
     * A promise to the Notifications service which takes care of observing and delivering notifications
     */
    private notificationsService: NotificationsService,

    /**
     * A promise to the Campaign service which takes care of managing current and upcoming campaigns
     */
    private campaignService: CampaignService,
  ) {
    super({
      initialLoadWaitExpired: {
        schedule: { delayInMinutes: 1 },
        handler: () => this.store.dispatch(initializationLoadingTimeHitLimit()),
      },
    })

    // Start up the redux store and set it up for proxying.
    this.store = initializeStore(this, savedReduxState)
    this.initializeRedux()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    // Clean up island assets if the feature is disabled to save state space
    if (isDisabled(FeatureFlags.SHOW_TOKEN_FEATURES)) {
      this.store.dispatch(clearIslandAssets())
    }

    const servicesToBeStarted = [
      this.preferenceService.startService(),
      this.chainService.startService(),
      this.indexingService.startService(),
      this.enrichmentService.startService(),
      this.internalSignerService.startService(),
      this.nameService.startService(),
      this.internalEthereumProviderService.startService(),
      this.providerBridgeService.startService(),
      this.islandService.startService(),
      this.telemetryService.startService(),
      this.ledgerService.startService(),
      this.signingService.startService(),
      this.analyticsService.startService(),
      this.nftsService.startService(),
      this.abilitiesService.startService(),
      this.notificationsService.startService(),
      this.campaignService.startService(),
    ]

    await Promise.all(servicesToBeStarted)
  }

  protected override async internalStopService(): Promise<void> {
    const servicesToBeStopped = [
      this.preferenceService.stopService(),
      this.chainService.stopService(),
      this.indexingService.stopService(),
      this.enrichmentService.stopService(),
      this.internalSignerService.stopService(),
      this.nameService.stopService(),
      this.internalEthereumProviderService.stopService(),
      this.providerBridgeService.stopService(),
      this.islandService.stopService(),
      this.telemetryService.stopService(),
      this.ledgerService.stopService(),
      this.signingService.stopService(),
      this.analyticsService.stopService(),
      this.nftsService.stopService(),
      this.abilitiesService.stopService(),
      this.notificationsService.stopService(),
      this.campaignService.stopService(),
    ]

    await Promise.all(servicesToBeStopped)
    await super.internalStopService()
  }

  async initializeRedux(): Promise<void> {
    this.connectIndexingService()
    this.connectInternalSignerService()
    this.connectNameService()
    this.connectInternalEthereumProviderService()
    this.connectProviderBridgeService()
    this.connectPreferenceService()
    this.connectEnrichmentService()
    this.connectIslandService()
    this.connectTelemetryService()
    this.connectLedgerService()
    this.connectSigningService()
    this.connectAnalyticsService()
    this.connectAbilitiesService()
    this.connectNFTsService()
    this.connectNotificationsService()
    this.connectCampaignService()

    await this.connectChainService()

    // FIXME Should no longer be necessary once transaction queueing enters the
    // FIXME picture.
    this.store.dispatch(
      clearTransactionState(TransactionConstructionStatus.Idle),
    )

    this.store.dispatch(clearApprovalInProgress())
  }

  async addAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    await this.chainService.addAccountToTrack(addressNetwork)
  }

  addOrEditAddressName({
    address,
    network,
    name,
  }: AddressOnNetwork & { name: string }): void {
    this.preferenceService.addOrEditNameInAddressBook({
      address,
      network,
      name,
    })
    this.analyticsService.sendAnalyticsEvent(AnalyticsEvent.ACCOUNT_NAME_EDITED)
  }

  async removeAccount(
    address: HexString,
    signer: AccountSigner,
    lastAddressInAccount: boolean,
  ): Promise<void> {
    // FIXME This whole method should be replaced with a call to
    // FIXME signerService.removeAccount and an event emission that is
    // FIXME observed by other services, either directly or indirectly.
    this.store.dispatch(deleteAccount(address))

    if (signer.type !== AccountType.ReadOnly && lastAddressInAccount) {
      await this.preferenceService.deleteAccountSignerSettings(signer)
    }

    if (signer.type === "ledger" && lastAddressInAccount) {
      this.store.dispatch(removeDevice(signer.deviceID))
    }

    this.store.dispatch(removeActivities(address))

    // remove NFTs
    this.store.dispatch(deleteNFTsForAddress(address))
    await this.nftsService.removeNFTsForAddress(address)

    // remove abilities
    if (signer.type !== AccountType.ReadOnly) {
      await this.abilitiesService.deleteAbilitiesForAccount(address)
    }
    // remove dApp permissions
    this.store.dispatch(revokePermissionsForAddress(address))
    await this.providerBridgeService.revokePermissionsForAddress(address)
    // TODO Adjust to handle specific network.
    await this.signingService.removeAccount(address, signer.type)

    this.nameService.removeAccount(address)

    // remove discovery tx hash for custom asset
    this.indexingService.removeDiscoveryTxHash(address)
  }

  async importLedgerAccounts(
    accounts: Array<{
      path: string
      address: string
    }>,
  ): Promise<void> {
    const trackedNetworks = await this.chainService.getTrackedNetworks()
    await Promise.all(
      accounts.map(async ({ path, address }) => {
        await this.ledgerService.saveAddress(path, address)

        await Promise.all(
          trackedNetworks.map(async (network) => {
            const addressNetwork = {
              address,
              network,
            }
            await this.chainService.addAccountToTrack(addressNetwork)
            this.abilitiesService.getNewAccountAbilities(address)

            this.store.dispatch(loadAccount(addressNetwork))
          }),
        )
      }),
    )
    this.store.dispatch(
      setNewSelectedAccount({
        address: accounts[0].address,
        network:
          await this.internalEthereumProviderService.getCurrentOrDefaultNetworkForOrigin(
            TAHO_INTERNAL_ORIGIN,
          ),
      }),
    )
  }

  async deriveLedgerAddress(
    deviceID: string,
    derivationPath: string,
  ): Promise<string> {
    return this.signingService.deriveAddress({
      type: "ledger",
      deviceID,
      path: derivationPath,
    })
  }

  async connectLedger(): Promise<string | null> {
    return this.ledgerService.refreshConnectedLedger()
  }

  async getAccountEthBalanceUncached(
    addressNetwork: AddressOnNetwork,
  ): Promise<bigint> {
    const accountBalance =
      await this.chainService.getLatestBaseAccountBalance(addressNetwork)

    return accountBalance.assetAmount.amount
  }

  async enrichActivitiesForSelectedAccount(): Promise<void> {
    const addressNetwork = this.store.getState().ui.selectedAccount
    if (addressNetwork) {
      await this.enrichActivities(addressNetwork)
    }
  }

  async enrichActivities(addressNetwork: AddressOnNetwork): Promise<void> {
    const accountsToTrack = await this.chainService.getAccountsToTrack()

    const activitiesToEnrich = selectActivitesHashesForEnrichment(
      this.store.getState(),
    )

    activitiesToEnrich.forEach(async (txHash) => {
      const transaction = await this.chainService.getTransaction(
        addressNetwork.network,
        txHash,
      )
      const enrichedTransaction =
        await this.enrichmentService.enrichTransaction(transaction, 2)

      this.store.dispatch(
        addActivity({
          transaction: enrichedTransaction,
          forAccounts: getRelevantTransactionAddresses(
            enrichedTransaction,
            accountsToTrack,
          ),
        }),
      )
    })
  }

  async connectChainService(): Promise<void> {
    // Initialize activities for all accounts once on and then
    // initialize for each account when it is needed
    this.chainService.emitter.on("initializeActivities", async (payload) => {
      this.store.dispatch(initializeActivities(payload))
      await this.enrichActivitiesForSelectedAccount()

      this.chainService.emitter.on(
        "initializeActivitiesForAccount",
        async (payloadForAccount) => {
          this.store.dispatch(initializeActivitiesForAccount(payloadForAccount))
          await this.enrichActivitiesForSelectedAccount()
        },
      )

      // Set up initial state.
      const existingAccounts = await this.chainService.getAccountsToTrack()
      existingAccounts.forEach((addressNetwork) => {
        // Mark as loading and wire things up.
        this.store.dispatch(loadAccount(addressNetwork))
      })

      // Set up Island Monitoring
      await this.islandService.startMonitoringIfNeeded()
    })

    // Wire up chain service to account slice.
    this.chainService.emitter.on(
      "accountsWithBalances",
      (accountWithBalance) => {
        // The first account balance update will transition the account to loading.
        this.store.dispatch(updateAccountBalance(accountWithBalance))
      },
    )

    this.chainService.emitter.on("supportedNetworks", (supportedNetworks) => {
      this.store.dispatch(setEVMNetworks(supportedNetworks))
    })

    this.chainService.emitter.on("block", (block) => {
      this.store.dispatch(blockSeen(block))
    })

    this.chainService.emitter.on("transactionSend", async () => {
      this.store.dispatch(
        setSnackbarMessage("Transaction signed, broadcasting..."),
      )
      this.store.dispatch(
        clearTransactionState(TransactionConstructionStatus.Idle),
      )
      await this.autoToggleFlashbotsProvider()
    })

    earnSliceEmitter.on("earnDeposit", (message) => {
      this.store.dispatch(setSnackbarMessage(message))
    })

    this.chainService.emitter.on("transactionSendFailure", async () => {
      this.store.dispatch(
        setSnackbarMessage("Transaction failed to broadcast."),
      )
      await this.autoToggleFlashbotsProvider()
    })

    transactionConstructionSliceEmitter.on(
      "updateTransaction",
      async (transaction) => {
        const { network } = transaction

        const {
          values: { maxFeePerGas, maxPriorityFeePerGas },
        } = selectDefaultNetworkFeeSettings(this.store.getState())

        const { transactionRequest: populatedRequest, gasEstimationError } =
          await this.chainService.populatePartialTransactionRequest(
            network,
            { ...transaction },
            { maxFeePerGas, maxPriorityFeePerGas },
          )

        // Create promise to pass into Promise.race
        const getAnnotation = async () => {
          const { annotation } =
            await this.enrichmentService.enrichTransactionSignature(
              network,
              populatedRequest,
              2 /* TODO desiredDecimals should be configurable */,
            )
          return annotation
        }

        const maybeEnrichedAnnotation = await Promise.race([
          getAnnotation(),
          // Wait 10 seconds before discarding enrichment
          wait(10_000),
        ])

        if (maybeEnrichedAnnotation) {
          populatedRequest.annotation = maybeEnrichedAnnotation
        }

        this.store.dispatch(
          transactionRequest({
            transactionRequest: populatedRequest,
            transactionLikelyFails: typeof gasEstimationError !== "undefined",
            gasEstimationError,
          }),
        )
      },
    )

    transactionConstructionSliceEmitter.on(
      "broadcastSignedTransaction",
      async (transaction: SignedTransaction) => {
        this.chainService.broadcastSignedTransaction(transaction)
      },
    )

    transactionConstructionSliceEmitter.on(
      "requestSignature",
      async ({ request, accountSigner }) => {
        try {
          const signedTransactionResult =
            await this.signingService.signTransaction(request, accountSigner)
          await this.store.dispatch(transactionSigned(signedTransactionResult))
        } catch (exception) {
          logger.error("Error signing transaction", exception)
          this.store.dispatch(
            clearTransactionState(TransactionConstructionStatus.Idle),
          )
        }
      },
    )
    signingSliceEmitter.on(
      "requestSignTypedData",
      async ({ typedData, account, accountSigner }) => {
        try {
          const signedData = await this.signingService.signTypedData({
            typedData,
            account,
            accountSigner,
          })
          this.store.dispatch(signedTypedData(signedData))
        } catch (err) {
          logger.error("Error signing typed data", typedData, "error: ", err)
          this.store.dispatch(clearSigningState)
        }
      },
    )
    signingSliceEmitter.on(
      "requestSignData",
      async ({ rawSigningData, account, accountSigner }) => {
        const signedData = await this.signingService.signData(
          account,
          rawSigningData,
          accountSigner,
        )
        this.store.dispatch(signedDataAction(signedData))
      },
    )

    this.chainService.emitter.on(
      "blockPrices",
      async ({ blockPrices, network }) => {
        if (network.chainID === OPTIMISM.chainID) {
          const { transactionRequest: currentTransactionRequest } =
            this.store.getState().transactionConstruction
          if (currentTransactionRequest?.network.chainID === OPTIMISM.chainID) {
            // If there is a currently pending transaction request on Optimism,
            // we need to update its L1 rollup fee as well as the current estimated fees per gas
            const estimatedRollupFee =
              await this.chainService.estimateL1RollupFeeForOptimism(
                currentTransactionRequest.network,
                currentTransactionRequest,
              )
            const estimatedRollupGwei =
              await this.chainService.estimateL1RollupGasPrice(network)

            this.store.dispatch(
              updateRollupEstimates({
                estimatedRollupFee,
                estimatedRollupGwei,
              }),
            )
          }
        }
        this.store.dispatch(
          estimatedFeesPerGas({ estimatedFeesPerGas: blockPrices, network }),
        )
      },
    )

    // Report on transactions for basic activity. Fancier stuff is handled via
    // connectEnrichmentService
    this.chainService.emitter.on("transaction", async (transactionInfo) => {
      this.store.dispatch(addActivity(transactionInfo))
    })

    uiSliceEmitter.on("userActivityEncountered", (addressOnNetwork) => {
      this.abilitiesService.refreshAbilities()
      this.chainService.markAccountActivity(addressOnNetwork)
    })
  }

  async connectNameService(): Promise<void> {
    this.nameService.emitter.on(
      "resolvedName",
      async ({
        from: { addressOnNetwork },
        resolved: {
          nameOnNetwork: { name },
        },
      }) => {
        this.store.dispatch(updateAccountName({ ...addressOnNetwork, name }))
      },
    )

    this.nameService.emitter.on(
      "resolvedAvatar",
      async ({ from: { addressOnNetwork }, resolved: { avatar } }) => {
        this.store.dispatch(
          updateENSAvatar({
            ...addressOnNetwork,
            avatar: avatar.toString(),
          }),
        )
      },
    )
  }

  async connectIndexingService(): Promise<void> {
    this.indexingService.emitter.on(
      "accountsWithBalances",
      async ({ balances, addressOnNetwork }) => {
        const assetsToTrack = await this.indexingService.getAssetsToTrack()
        const trackedAccounts = await this.chainService.getAccountsToTrack()
        const allTrackedAddresses = new Set(
          trackedAccounts.map((account) => account.address),
        )

        if (!allTrackedAddresses.has(addressOnNetwork.address)) {
          return
        }

        const filteredBalancesToDispatch: AccountBalance[] = []

        balances
          .filter(
            (balance) =>
              // Network base assets with smart contract addresses from some networks
              // e.g. Optimism, Polygon might have been retrieved through alchemy as
              // token balances but they should not be handled here as they would
              // not be correctly treated as base assets
              !isBaseAssetForNetwork(
                balance.assetAmount.asset,
                balance.network,
              ),
          )
          .forEach((balance) => {
            // TODO support multi-network assets
            const balanceHasAnAlreadyTrackedAsset = assetsToTrack.some(
              (tracked) => isSameAsset(tracked, balance.assetAmount.asset),
            )

            if (
              balance.assetAmount.amount > 0 ||
              balanceHasAnAlreadyTrackedAsset
            ) {
              filteredBalancesToDispatch.push(balance)
            }
          })

        this.store.dispatch(
          updateAccountBalance({
            balances: filteredBalancesToDispatch,
            addressOnNetwork,
          }),
        )
      },
    )

    this.indexingService.emitter.on(
      "assetsLoaded",
      async ({ assets, loadingScope }) => {
        await this.store.dispatch(assetsLoaded({ assets, loadingScope }))

        const smartContractAssets = assets.filter(isSmartContractFungibleAsset)
        if (smartContractAssets.length > 0) {
          this.store.dispatch(updateAccountAssetReferences(smartContractAssets))
          this.store.dispatch(updatePriceAssetReferences(smartContractAssets))
        }
      },
    )

    this.indexingService.emitter.on("prices", (pricePoints) => {
      this.store.dispatch(newPricePoints(pricePoints))
    })

    this.indexingService.emitter.on("refreshAsset", (asset) => {
      this.store.dispatch(
        refreshAsset({
          asset,
        }),
      )
    })

    this.indexingService.emitter.on("removeAssetData", (asset) => {
      this.store.dispatch(removeAssetData({ asset }))
    })
  }

  async connectEnrichmentService(): Promise<void> {
    this.enrichmentService.emitter.on(
      "enrichedEVMTransaction",
      (transactionData) => {
        this.indexingService.notifyEnrichedTransaction(
          transactionData.transaction,
        )
        this.store.dispatch(addActivity(transactionData))
      },
    )
  }

  async connectSigningService(): Promise<void> {
    this.internalSignerService.emitter.on("address", (address) =>
      this.signingService.addTrackedAddress(address, "keyring"),
    )

    this.ledgerService.emitter.on("address", ({ address }) =>
      this.signingService.addTrackedAddress(address, "ledger"),
    )
  }

  async connectLedgerService(): Promise<void> {
    this.store.dispatch(resetLedgerState())

    this.ledgerService.emitter.on("connected", ({ id, metadata }) => {
      this.store.dispatch(
        setDeviceConnectionStatus({
          deviceID: id,
          status: "available",
          isArbitraryDataSigningEnabled: metadata.isArbitraryDataSigningEnabled,
          displayDetails: metadata.displayDetails,
        }),
      )
    })

    this.ledgerService.emitter.on("disconnected", ({ id }) => {
      this.store.dispatch(
        setDeviceConnectionStatus({
          deviceID: id,
          status: "disconnected",
          isArbitraryDataSigningEnabled: false /* dummy */,
          displayDetails: undefined,
        }),
      )
    })

    this.ledgerService.emitter.on("usbDeviceCount", (usbDeviceCount) => {
      this.store.dispatch(setUsbDeviceCount({ usbDeviceCount }))
    })
  }

  async connectInternalSignerService(): Promise<void> {
    this.internalSignerService.emitter.on("internalSigners", (signers) => {
      this.store.dispatch(updateInternalSigners(signers))
    })

    this.internalSignerService.emitter.on("address", async (address) => {
      const trackedNetworks = await this.chainService.getTrackedNetworks()
      trackedNetworks.forEach((network) => {
        // Mark as loading and wire things up.
        this.store.dispatch(
          loadAccount({
            address,
            network,
          }),
        )

        this.chainService.addAccountToTrack({
          address,
          network,
        })
        this.abilitiesService.getNewAccountAbilities(address)
      })
    })

    this.internalSignerService.emitter.on("locked", async (isLocked) => {
      if (isLocked) {
        this.store.dispatch(internalSignerLocked())
      } else {
        this.store.dispatch(internalSignerUnlocked())
      }
    })

    internalSignerSliceEmitter.on("createPassword", async (password) => {
      await this.internalSignerService.unlock(password, true)
    })

    internalSignerSliceEmitter.on("lockInternalSigners", async () => {
      await this.internalSignerService.lock()
    })

    internalSignerSliceEmitter.on("deriveAddress", async (keyringID) => {
      await this.signingService.deriveAddress({
        type: "keyring",
        keyringID,
      })
    })

    internalSignerSliceEmitter.on("generateNewKeyring", async (path) => {
      // TODO move unlocking to a reasonable place in the initialization flow
      const generated: {
        id: string
        mnemonic: string[]
      } = await this.internalSignerService.generateNewKeyring(
        SignerInternalTypes.mnemonicBIP39S256,
        path,
      )

      this.store.dispatch(setKeyringToVerify(generated))
    })
  }

  async connectInternalEthereumProviderService(): Promise<void> {
    this.internalEthereumProviderService.emitter.on(
      "transactionSignatureRequest",
      async ({ payload, resolver, rejecter }) => {
        await this.signingService.prepareForSigningRequest()

        this.store.dispatch(
          clearTransactionState(TransactionConstructionStatus.Pending),
        )
        this.store.dispatch(updateTransactionData(payload))

        const clear = () => {
          // Mutual dependency to handleAndClear.
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          this.signingService.emitter.off("signingTxResponse", handleAndClear)

          transactionConstructionSliceEmitter.off(
            "signatureRejected",
            // Mutual dependency to rejectAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            rejectAndClear,
          )
        }

        const handleAndClear = (response: TXSignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-tx":
              resolver(response.signedTx)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = async () => {
          await this.autoToggleFlashbotsProvider()
          clear()
          rejecter()
        }

        this.signingService.emitter.on("signingTxResponse", handleAndClear)

        transactionConstructionSliceEmitter.on(
          "signatureRejected",
          rejectAndClear,
        )
      },
    )
    this.internalEthereumProviderService.emitter.on(
      "signTypedDataRequest",
      async ({
        payload,
        resolver,
        rejecter,
      }: {
        payload: SignTypedDataRequest
        resolver: (result: string | PromiseLike<string>) => void
        rejecter: () => void
      }) => {
        // Run signer preparation and enrichment in parallel.
        const [, enrichedSignTypedDataRequest] = await Promise.all([
          this.signingService.prepareForSigningRequest(),
          this.enrichmentService.enrichSignTypedDataRequest(payload),
        ])

        this.store.dispatch(typedDataRequest(enrichedSignTypedDataRequest))

        const clear = () => {
          this.signingService.emitter.off(
            "signingDataResponse",
            // Mutual dependency to handleAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            handleAndClear,
          )

          signingSliceEmitter.off(
            "signatureRejected",
            // Mutual dependency to rejectAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            rejectAndClear,
          )
        }

        const handleAndClear = (response: SignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-data":
              resolver(response.signedData)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = () => {
          clear()
          rejecter()
        }

        this.signingService.emitter.on("signingDataResponse", handleAndClear)

        signingSliceEmitter.on("signatureRejected", rejectAndClear)
      },
    )
    this.internalEthereumProviderService.emitter.on(
      "signDataRequest",
      async ({
        payload,
        resolver,
        rejecter,
      }: {
        payload: MessageSigningRequest
        resolver: (result: string | PromiseLike<string>) => void
        rejecter: () => void
      }) => {
        await this.signingService.prepareForSigningRequest()

        this.chainService.pollBlockPricesForNetwork(
          payload.account.network.chainID,
        )
        this.store.dispatch(signDataRequest(payload))

        const clear = () => {
          this.signingService.emitter.off(
            "personalSigningResponse",
            // Mutual dependency to handleAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            handleAndClear,
          )

          signingSliceEmitter.off(
            "signatureRejected",
            // Mutual dependency to rejectAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            rejectAndClear,
          )
        }

        const handleAndClear = (response: SignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-data":
              resolver(response.signedData)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = () => {
          clear()
          rejecter()
        }

        this.signingService.emitter.on(
          "personalSigningResponse",
          handleAndClear,
        )

        signingSliceEmitter.on("signatureRejected", rejectAndClear)
      },
    )
    this.internalEthereumProviderService.emitter.on(
      "selectedNetwork",
      (network) => {
        this.store.dispatch(setSelectedNetwork(network))
      },
    )
    this.internalEthereumProviderService.emitter.on(
      "networkSwitchedForOrigin",
      async ({ origin, network }) => {
        this.store.dispatch(setCurrentNetworkForOrigin({ origin, network }))
        await this.providerBridgeService.notifyContentScriptsAboutNetworkChange(
          origin,
          network.chainID,
        )
      },
    )

    uiSliceEmitter.on("newSelectedNetwork", (network) => {
      this.internalEthereumProviderService.routeSafeRPCRequest(
        "wallet_switchEthereumChain",
        [{ chainId: network.chainID }],
        TAHO_INTERNAL_ORIGIN,
      )
      this.chainService.pollBlockPricesForNetwork(network.chainID)
      this.store.dispatch(clearCustomGas())
    })

    this.internalEthereumProviderService.emitter.on(
      "watchAssetRequest",
      async ({ contractAddress, network }) => {
        const { address } = this.store.getState().ui.selectedAccount
        const asset = await this.indexingService.addTokenToTrackByContract(
          network,
          contractAddress,
        )
        if (asset) {
          await this.indexingService.retrieveTokenBalances(
            {
              address,
              network,
            },
            [asset],
          )
        }
      },
    )
  }

  async connectProviderBridgeService(): Promise<void> {
    uiSliceEmitter.on("addCustomNetworkResponse", ([requestId, success]) =>
      this.providerBridgeService.handleAddNetworkRequest(requestId, success),
    )

    this.providerBridgeService.emitter.on(
      "requestPermission",
      (permissionRequest: PermissionRequest) => {
        this.store.dispatch(requestPermission(permissionRequest))
      },
    )

    this.providerBridgeService.emitter.on(
      "initializeAllowedPages",
      async (allowedPages: PermissionMap) => {
        this.store.dispatch(initializePermissions(allowedPages))
      },
    )

    this.providerBridgeService.emitter.on(
      "setClaimReferrer",
      async (referral: string) => {
        const isAddress = isProbablyEVMAddress(referral)
        const network = ETHEREUM
        const ensName = isAddress
          ? (
              await this.nameService.lookUpName({
                address: referral,
                network,
              })
            )?.resolved?.nameOnNetwork?.name
          : referral
        const address = isAddress
          ? referral
          : (
              await this.nameService.lookUpEthereumAddress({
                name: referral,
                network,
              })
            )?.resolved?.addressOnNetwork?.address

        if (typeof address !== "undefined") {
          this.store.dispatch(
            setReferrer({
              address,
              ensName,
            }),
          )
        }
      },
    )

    providerBridgeSliceEmitter.on("grantPermission", async (permission) => {
      if (permission.origin === new URL(DAPP_BASE_URL).origin) {
        this.campaignService.checkMezoSatsDrop(permission.accountAddress)
      }
    })

    providerBridgeSliceEmitter.on("grantPermission", async (permission) => {
      this.analyticsService.sendAnalyticsEvent(AnalyticsEvent.DAPP_CONNECTED, {
        origin: permission.origin,
        chainId: permission.chainID,
      })

      await Promise.all(
        this.chainService.supportedNetworks.map(async (network) => {
          await this.providerBridgeService.grantPermission({
            ...permission,
            chainID: network.chainID,
          })
        }),
      )
    })

    providerBridgeSliceEmitter.on(
      "denyOrRevokePermission",
      async (permission) => {
        await Promise.all(
          this.chainService.supportedNetworks.map(async (network) => {
            await this.providerBridgeService.denyOrRevokePermission({
              ...permission,
              chainID: network.chainID,
            })
          }),
        )
      },
    )

    providerBridgeSliceEmitter.on(
      "switchNetworkForOrigin",
      async ({ origin, network }) => {
        await this.internalEthereumProviderService.switchToSupportedNetwork(
          origin,
          network,
        )
      },
    )
  }

  async connectPreferenceService(): Promise<void> {
    this.preferenceService.emitter.on(
      "initializeDefaultWallet",
      async (isDefaultWallet: boolean) => {
        await this.store.dispatch(setDefaultWallet(isDefaultWallet))
      },
    )

    this.preferenceService.emitter.on(
      "initializeShowTestNetworks",
      async (showTestNetworks: boolean) => {
        await this.store.dispatch(toggleTestNetworks(showTestNetworks))
      },
    )

    uiSliceEmitter.on("toggleShowTestNetworks", async (value) => {
      await this.preferenceService.setShowTestNetworks(value)
      await this.store.dispatch(toggleTestNetworks(value))
    })

    this.preferenceService.emitter.on(
      "initializeSelectedAccount",
      async (dbAddressNetwork: AddressOnNetwork) => {
        if (dbAddressNetwork) {
          // Wait until chain service starts and populates supported networks
          await this.chainService.started()

          const { address, network } = dbAddressNetwork
          let supportedNetwork = this.chainService.supportedNetworks.find(
            (net) => sameNetwork(network, net),
          )

          if (!supportedNetwork) {
            // eslint-disable-next-line prefer-destructuring
            supportedNetwork = this.chainService.supportedNetworks[0]
          }

          this.store.dispatch(
            setSelectedAccount({ address, network: supportedNetwork }),
          )
        } else {
          // Update currentAddress in db if it's not set but it is in the store
          // should run only one time
          const addressNetwork = this.store.getState().ui.selectedAccount

          if (addressNetwork) {
            await this.preferenceService.setSelectedAccount(addressNetwork)
          }
        }
      },
    )

    this.preferenceService.emitter.on(
      "updatedSignerSettings",
      (accountSignerSettings) => {
        this.store.dispatch(setAccountsSignerSettings(accountSignerSettings))
      },
    )

    this.preferenceService.emitter.on(
      "updateAutoLockInterval",
      async (newTimerValue) => {
        await this.internalSignerService.updateAutoLockInterval()
        this.store.dispatch(setAutoLockInterval(newTimerValue))
      },
    )

    this.preferenceService.emitter.on(
      "initializeShownDismissableItems",
      async (dismissableItems) => {
        this.store.dispatch(setShownDismissableItems(dismissableItems))
      },
    )

    this.preferenceService.emitter.on(
      "initializeNotificationsPreferences",
      async (isPermissionGranted) => {
        this.store.dispatch(toggleNotifications(isPermissionGranted))
      },
    )

    this.preferenceService.emitter.on(
      "dismissableItemMarkedAsShown",
      async (dismissableItem) => {
        this.store.dispatch(dismissableItemMarkedAsShown(dismissableItem))
      },
    )

    uiSliceEmitter.on("newSelectedAccount", async (addressNetwork) => {
      await this.preferenceService.setSelectedAccount(addressNetwork)

      this.store.dispatch(clearSwapQuote())
      this.store.dispatch(setEligibilityLoading())
      this.islandService.getEligibility(addressNetwork.address)

      this.store.dispatch(setVaultsAsStale())

      await this.chainService.markAccountActivity(addressNetwork)

      const referrerStats =
        await this.islandService.getReferrerStats(addressNetwork)
      this.store.dispatch(setReferrerStats(referrerStats))

      this.providerBridgeService.notifyContentScriptsAboutAddressChange()
    })

    uiSliceEmitter.on("newSelectedAccountSwitched", async (addressNetwork) => {
      this.enrichActivities(addressNetwork)
    })

    uiSliceEmitter.on(
      "newDefaultWalletValue",
      async (newDefaultWalletValue) => {
        await this.preferenceService.setDefaultWalletValue(
          newDefaultWalletValue,
        )

        // FIXME Both of these should be done as observations of the preference
        // FIXME service event rather than being managed by `main`.
        this.providerBridgeService.notifyContentScriptAboutConfigChange(
          newDefaultWalletValue,
        )
        this.analyticsService.sendAnalyticsEvent(
          AnalyticsEvent.DEFAULT_WALLET_TOGGLED,
          {
            setToDefault: newDefaultWalletValue,
          },
        )
      },
    )

    uiSliceEmitter.on("refreshBackgroundPage", async () => {
      window.location.reload()
    })
  }

  async connectIslandService(): Promise<void> {
    this.islandService.emitter.on(
      "newEligibility",
      async (eligibility: Eligible) => {
        await this.store.dispatch(setEligibility(eligibility))
      },
    )

    this.islandService.emitter.on(
      "newReferral",
      async (
        referral: {
          referrer: AddressOnNetwork
        } & ReferrerStats,
      ) => {
        const { referrer, referredUsers, bonusTotal } = referral
        const { selectedAccount } = this.store.getState().ui

        if (
          normalizeEVMAddress(referrer.address) ===
          normalizeEVMAddress(selectedAccount.address)
        ) {
          this.store.dispatch(
            setReferrerStats({
              referredUsers,
              bonusTotal,
            }),
          )
        }
      },
    )

    this.islandService.emitter.on("monitoringTestnetAsset", (asset) => {
      this.store.dispatch(addIslandAsset(asset))
    })
  }

  connectTelemetryService(): void {
    // Pass the redux store to the telemetry service so we can analyze its size
    this.telemetryService.connectReduxStore(this.store)
  }

  connectNFTsService(): void {
    this.nftsService.emitter.on(
      "initializeNFTs",
      (collections: NFTCollection[]) => {
        this.store.dispatch(initializeNFTs(collections))
      },
    )
    this.nftsService.emitter.on(
      "updateCollections",
      (collections: NFTCollection[]) => {
        this.store.dispatch(updateNFTsCollections(collections))
      },
    )
    this.nftsService.emitter.on("updateNFTs", async (payload) => {
      await this.store.dispatch(updateNFTs(payload))
    })
    this.nftsService.emitter.on("removeTransferredNFTs", async (payload) => {
      this.store.dispatch(deleteTransferredNFTs(payload))
    })
    this.nftsService.emitter.on("isReloadingNFTs", async (payload) => {
      this.store.dispatch(updateIsReloading(payload))
    })
    nftsSliceEmitter.on("fetchNFTs", ({ collectionID, account }) =>
      this.nftsService.fetchNFTsFromCollection(collectionID, account),
    )
    nftsSliceEmitter.on("refetchNFTs", ({ collectionID, account }) =>
      this.nftsService.refreshNFTsFromCollection(collectionID, account),
    )
    nftsSliceEmitter.on("fetchMoreNFTs", ({ collectionID, account }) =>
      this.nftsService.fetchNFTsFromNextPage(collectionID, account),
    )
    nftsSliceEmitter.on("refetchCollections", () =>
      this.nftsService.refreshCollections(),
    )
  }

  connectAbilitiesService(): void {
    this.abilitiesService.emitter.on("initAbilities", (address) => {
      this.store.dispatch(initAbilities(address))
    })
    this.abilitiesService.emitter.on(
      "updatedAbilities",
      ({ address, abilities }) => {
        this.store.dispatch(setAbilitiesForAddress({ address, abilities }))
      },
    )
    this.abilitiesService.emitter.on("deleteAbilities", (address) => {
      this.store.dispatch(deleteAbilitiesForAccount(address))
    })
    this.abilitiesService.emitter.on("updatedAbility", (ability) => {
      this.store.dispatch(updateAbility(ability))
    })
    this.abilitiesService.emitter.on("newAccount", (address) => {
      this.store.dispatch(addAccountFilter(address))
    })
    this.abilitiesService.emitter.on("deleteAccount", (address) => {
      this.store.dispatch(deleteAccountFilter(address))
    })
  }

  connectNotificationsService(): void {
    this.islandService.emitter.on("newXpDrop", () => {
      this.notificationsService.notifyXPDrop()
    })

    uiSliceEmitter.on("clearNotification", (id: string) =>
      this.notificationsService.clearNotification(id),
    )
  }

  async unlockInternalSigners(password: string): Promise<boolean> {
    return this.internalSignerService.unlock(password)
  }

  async exportMnemonic(address: HexString): Promise<string | null> {
    return this.internalSignerService.exportMnemonic(address)
  }

  async exportPrivateKey(address: HexString): Promise<string | null> {
    return this.internalSignerService.exportPrivateKey(address)
  }

  async importSigner(signerRaw: SignerImportMetadata): Promise<string | null> {
    return this.internalSignerService.importSigner(signerRaw)
  }

  async getActivityDetails(txHash: string): Promise<ActivityDetail[]> {
    const addressNetwork = this.store.getState().ui.selectedAccount
    const transaction = await this.chainService.getTransaction(
      addressNetwork.network,
      txHash,
    )
    const enrichedTransaction = await this.enrichmentService.enrichTransaction(
      transaction,
      2,
    )

    return getActivityDetails(enrichedTransaction)
  }

  async connectAnalyticsService(): Promise<void> {
    this.analyticsService.emitter.on("enableDefaultOn", () => {
      this.store.dispatch(setShowAnalyticsNotification(true))
    })

    this.chainService.emitter.on("networkSubscribed", (network) => {
      this.analyticsService.sendOneTimeAnalyticsEvent(
        OneTimeAnalyticsEvent.CHAIN_ADDED,
        {
          chainId: network.chainID,
          name: network.name,
          description:
            "This event is fired when a chain is subscribed to from the wallet for the first time.",
        },
      )
    })

    // ⚠️ Note: We NEVER send addresses to analytics!
    this.chainService.emitter.on("newAccountToTrack", () => {
      this.analyticsService.sendAnalyticsEvent(
        AnalyticsEvent.NEW_ACCOUNT_TO_TRACK,
        {
          description: `
                This event is fired when any address on a network is added to the tracked list. 
                
                Note: this does not track recovery phrase(ish) import! But when an address is used 
                on a network for the first time (read-only or recovery phrase/ledger/keyring/private key).
                `,
        },
      )
    })

    this.chainService.emitter.on("customChainAdded", (chainInfo) => {
      this.analyticsService.sendAnalyticsEvent(
        AnalyticsEvent.CUSTOM_CHAIN_ADDED,
        {
          description: `
                This event is fired when a custom chain is added to the wallet.
                `,
          chainInfo: chainInfo.chainName,
          chainId: chainInfo.chainId,
        },
      )
    })

    this.preferenceService.emitter.on(
      "updateAnalyticsPreferences",
      async ({ isEnabled }: AnalyticsPreferences) => {
        const currentValue = this.store.getState().ui.settings.collectAnalytics

        // Check if this value has been updated so we prevent dispatching unnecessary
        // analytics events during initialization
        if (currentValue === isEnabled) {
          return
        }

        // This event is used on initialization and data change
        this.store.dispatch(
          toggleCollectAnalytics(
            // we are using only this field on the UI atm
            // it's expected that more detailed analytics settings will come
            isEnabled,
          ),
        )

        this.analyticsService.sendAnalyticsEvent(
          AnalyticsEvent.ANALYTICS_TOGGLED,
          {
            analyticsEnabled: isEnabled,
          },
        )
      },
    )

    uiSliceEmitter.on(
      "shouldShowNotifications",
      async (shouldShowNotifications: boolean) => {
        const notificationsEnabled =
          await this.preferenceService.setShouldShowNotifications(
            shouldShowNotifications,
          )

        this.store.dispatch(toggleNotifications(notificationsEnabled))
      },
    )

    uiSliceEmitter.on(
      "updateAnalyticsPreferences",
      async (analyticsPreferences: Partial<AnalyticsPreferences>) => {
        await this.preferenceService.updateAnalyticsPreferences(
          analyticsPreferences,
        )
      },
    )

    uiSliceEmitter.on("deleteAnalyticsData", () => {
      this.analyticsService.removeAnalyticsData()
    })

    uiSliceEmitter.on("sendEvent", (event) => {
      if (isOneTimeAnalyticsEvent(event)) {
        this.analyticsService.sendOneTimeAnalyticsEvent(event)
      } else {
        this.analyticsService.sendAnalyticsEvent(event)
      }
    })

    uiSliceEmitter.on("updateAutoLockInterval", async (newTimerValue) => {
      await this.preferenceService.updateAutoLockInterval(newTimerValue)
    })
  }

  async connectCampaignService() {
    this.providerBridgeService.emitter.on("getMezoClaimData", async () =>
      this.providerBridgeService.emitter.emit(
        "mezoClaimData",
        this.analyticsService.analyticsUUID,
      ),
    )

    this.campaignService.emitter.on("campaignStatusUpdate", (campaigns) => {
      this.store.dispatch(
        updateCampaignsState(
          Object.fromEntries(
            campaigns.map((campaign) => [campaign.id, campaign.data]),
          ),
        ),
      )
    })
  }

  async updateAssetMetadata(
    asset: SmartContractFungibleAsset,
    metadata: AnyAssetMetadata,
  ): Promise<void> {
    await this.indexingService.updateAssetMetadata(asset, metadata)
  }

  async hideAsset(asset: SmartContractFungibleAsset): Promise<void> {
    await this.indexingService.hideAsset(asset)
  }

  getAddNetworkRequestDetails(requestId: string): AddChainRequestData {
    return this.providerBridgeService.getNewCustomRPCDetails(requestId)
  }

  async updateSignerTitle(
    signer: AccountSignerWithId,
    title: string,
  ): Promise<void> {
    return this.preferenceService.updateAccountSignerTitle(signer, title)
  }

  async markDismissableItemAsShown(item: DismissableItem): Promise<void> {
    return this.preferenceService.markDismissableItemAsShown(item)
  }

  async resolveNameOnNetwork(
    nameOnNetwork: NameOnNetwork,
  ): Promise<AddressOnNetwork | undefined> {
    try {
      return (await this.nameService.lookUpEthereumAddress(nameOnNetwork))
        ?.resolved?.addressOnNetwork
    } catch (error) {
      logger.info("Error looking up Ethereum address: ", error)
      return undefined
    }
  }

  async pollForAbilities(address: NormalizedEVMAddress): Promise<void> {
    return this.abilitiesService.pollForAbilities(address)
  }

  async markAbilityAsCompleted(
    address: NormalizedEVMAddress,
    abilityId: string,
  ): Promise<void> {
    return this.abilitiesService.markAbilityAsCompleted(address, abilityId)
  }

  async markAbilityAsRemoved(
    address: NormalizedEVMAddress,
    abilityId: string,
  ): Promise<void> {
    return this.abilitiesService.markAbilityAsRemoved(address, abilityId)
  }

  async reportAndRemoveAbility(
    address: NormalizedEVMAddress,
    abilitySlug: string,
    abilityId: string,
    reason: string,
  ): Promise<void> {
    this.abilitiesService.reportAndRemoveAbility(
      address,
      abilitySlug,
      abilityId,
      reason,
    )
  }

  async removeEVMNetwork(chainID: string): Promise<void> {
    // Per origin chain id settings
    await this.internalEthereumProviderService.removePreferencesForChain(
      chainID,
    )
    // Connected dApps
    await this.providerBridgeService.revokePermissionsForChain(chainID)
    await this.chainService.removeCustomChain(chainID)
  }

  async toggleFlashbotsProvider(shouldUseFlashbots: boolean): Promise<void> {
    if (shouldUseFlashbots) {
      const flashbotsProvider = makeFlashbotsProviderCreator()
      await this.chainService.addCustomProvider(
        ETHEREUM.chainID,
        FLASHBOTS_RPC_URL,
        flashbotsProvider,
      )
    } else {
      await this.chainService.removeCustomProvider(ETHEREUM.chainID)
    }
  }

  async autoToggleFlashbotsProvider(): Promise<void> {
    const shouldUseFlashbots = this.store.getState().ui.settings.useFlashbots
    await this.toggleFlashbotsProvider(shouldUseFlashbots)
  }

  async queryCustomTokenDetails(
    contractAddress: NormalizedEVMAddress,
    addressOnNetwork: AddressOnNetwork,
  ): Promise<{
    asset: SmartContractFungibleAsset
    amount: bigint
    mainCurrencyAmount?: number
    balance: number
    exists?: boolean
  }> {
    const { network } = addressOnNetwork

    const cachedAsset = this.indexingService
      .getCachedAssets(network)
      .find(
        (asset): asset is SmartContractFungibleAsset =>
          isSmartContractFungibleAsset(asset) &&
          sameEVMAddress(contractAddress, asset.contractAddress),
      )

    const assetData = await this.chainService.queryAccountTokenDetails(
      contractAddress,
      addressOnNetwork,
      cachedAsset,
    )

    const priceData = await getTokenPrices([contractAddress], USD, network)

    const convertedAssetAmount =
      contractAddress in priceData
        ? convertAssetAmountViaPricePoint(
            assetData,
            getPricePoint(assetData.asset, priceData[contractAddress]),
          )
        : undefined

    const mainCurrencyAmount = convertedAssetAmount
      ? assetAmountToDesiredDecimals(convertedAssetAmount, 2)
      : undefined

    return {
      ...assetData,
      balance: Number.parseFloat(
        utils.formatUnits(assetData.amount, assetData.asset.decimals),
      ),
      mainCurrencyAmount,
      exists: !!cachedAsset,
    }
  }

  async importCustomToken(asset: SmartContractFungibleAsset): Promise<boolean> {
    return this.indexingService.importCustomToken(asset)
  }

  async connectPort(port: Runtime.Port) {
    this.connectPopupMonitor(port)
    this.providerBridgeService.connectPort(port)
  }

  private connectPopupMonitor(port: Runtime.Port) {
    if (port.name !== POPUP_MONITOR_PORT_NAME) return

    const openTime = Date.now()

    const originalNetworkName =
      this.store.getState().ui.selectedAccount.network.name

    port.onDisconnect.addListener(() => {
      const networkNameAtClose =
        this.store.getState().ui.selectedAccount.network.name
      this.analyticsService.sendAnalyticsEvent(AnalyticsEvent.UI_SHOWN, {
        openTime: new Date(openTime).toISOString(),
        closeTime: new Date().toISOString(),
        openLength: (Date.now() - openTime) / 1e3,
        networkName:
          originalNetworkName === networkNameAtClose
            ? originalNetworkName
            : "switched networks",
        unit: "s",
      })
      this.onPopupDisconnected()
    })
  }

  private onPopupDisconnected() {
    this.store.dispatch(rejectTransactionSignature())
    this.store.dispatch(rejectDataSignature())
  }
}
