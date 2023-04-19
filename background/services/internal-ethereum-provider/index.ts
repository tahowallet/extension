import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import { serialize as serializeEthersTransaction } from "@ethersproject/transactions"

import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  RPCRequest,
} from "@tallyho/provider-bridge-shared"
import { hexlify, toUtf8Bytes } from "ethers/lib/utils"
import logger from "../../lib/logger"

import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import ChainService from "../chain"
import {
  EVMNetwork,
  sameChainID,
  SignedTransaction,
  toHexChainID,
} from "../../networks"
import {
  ethersTransactionFromSignedTransaction,
  transactionRequestFromEthersTransactionRequest,
} from "../chain/utils"
import PreferenceService from "../preferences"
import { internalProviderPort } from "../../redux-slices/utils/contract-utils"

import {
  SignTypedDataRequest,
  MessageSigningRequest,
  parseSigningData,
} from "../../utils/signing"
import { getOrCreateDB, InternalEthereumProviderDatabase } from "./db"
import { TALLY_INTERNAL_ORIGIN } from "./constants"
import {
  EnrichedEVMTransactionRequest,
  TransactionAnnotation,
} from "../enrichment"
import { decodeJSON } from "../../lib/utils"
import { FeatureFlags, isEnabled } from "../../features"
import type { ValidatedAddEthereumChainParameter } from "../provider-bridge/utils"

// A type representing the transaction requests that come in over JSON-RPC
// requests like eth_sendTransaction and eth_signTransaction. These are very
// similar in structure to the Ethers internal TransactionRequest object, but
// have some subtle-yet-critical differences. Chief among these is the presence
// of `gas` instead of `gasLimit` and the _possibility_ of using `input` instead
// of `data`.
//
// Note that `input` is the newer and more correct field to expect contract call
// data in, but older clients may provide `data` instead. Ethers transmits `data`
// rather than `input` when used as a JSON-RPC client, and expects it as the
// `EthersTransactionRequest` field for that info.
//
// Additionally, internal provider requests can include an explicit
// JSON-serialized annotation field provided by the wallet. The internal
// provider disallows this field from non-internal sources.
type JsonRpcTransactionRequest = Omit<EthersTransactionRequest, "gasLimit"> & {
  gas?: string
  input?: string
  annotation?: string
}

// https://eips.ethereum.org/EIPS/eip-3326
export type SwitchEthereumChainParameter = {
  chainId: string
}

// https://eips.ethereum.org/EIPS/eip-3085
export type AddEthereumChainParameter = {
  chainId: string
  blockExplorerUrls?: string[]
  chainName?: string
  iconUrls?: string[]
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls?: string[]
}

type DAppRequestEvent<T, E> = {
  payload: T
  resolver: (result: E | PromiseLike<E>) => void
  rejecter: () => void
}

type Events = ServiceLifecycleEvents & {
  transactionSignatureRequest: DAppRequestEvent<
    Partial<EnrichedEVMTransactionRequest> & {
      from: string
      network: EVMNetwork
    },
    SignedTransaction
  >
  signTypedDataRequest: DAppRequestEvent<SignTypedDataRequest, string>
  signDataRequest: DAppRequestEvent<MessageSigningRequest, string>
  selectedNetwork: EVMNetwork
  // connect
  // disconnet
  // account change
  // networkchange
}

export default class InternalEthereumProviderService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    InternalEthereumProviderService,
    [Promise<ChainService>, Promise<PreferenceService>]
  > = async (chainService, preferenceService) => {
    return new this(
      await getOrCreateDB(),
      await chainService,
      await preferenceService
    )
  }

  private constructor(
    private db: InternalEthereumProviderDatabase,
    private chainService: ChainService,
    private preferenceService: PreferenceService
  ) {
    super()

    internalProviderPort.emitter.on("message", async (event) => {
      logger.debug(`internal: request payload: ${JSON.stringify(event)}`)
      try {
        const response = {
          id: event.id,
          result: await this.routeSafeRPCRequest(
            event.request.method,
            event.request.params,
            TALLY_INTERNAL_ORIGIN
          ),
        }
        logger.debug("internal response:", response)

        internalProviderPort.postResponse(response)
      } catch (error) {
        logger.debug("error processing request", event.id, error)

        internalProviderPort.postResponse({
          id: event.id,
          result: new EIP1193Error(
            EIP1193_ERROR_CODES.userRejectedRequest
          ).toJSON(),
        })
      }
    })
  }

  async routeSafeRPCRequest(
    method: string,
    params: RPCRequest["params"],
    origin: string
  ): Promise<unknown> {
    switch (method) {
      // supported alchemy methods: https://docs.alchemy.com/alchemy/apis/ethereum
      case "eth_signTypedData":
      case "eth_signTypedData_v1":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4":
        return this.signTypedData({
          account: {
            address: params[0] as string,
            network: await this.getCurrentOrDefaultNetworkForOrigin(origin),
          },
          typedData: JSON.parse(params[1] as string),
        })
      case "eth_chainId":
        // TODO Decide on a better way to track whether a particular chain is
        // allowed to have an RPC call made to it. Ideally this would be based
        // on a user's idea of a dApp connection rather than a network-specific
        // modality, requiring it to be constantly "switched"
        return toHexChainID(
          (await this.getCurrentOrDefaultNetworkForOrigin(origin)).chainID
        )
      case "eth_blockNumber":
      case "eth_call":
      case "eth_estimateGas":
      case "eth_feeHistory":
      case "eth_gasPrice":
      case "eth_getBalance":
      case "eth_getBlockByHash":
      case "eth_getBlockByNumber":
      case "eth_getBlockTransactionCountByHash":
      case "eth_getBlockTransactionCountByNumber":
      case "eth_getCode":
      case "eth_getFilterChanges":
      case "eth_getFilterLogs":
      case "eth_getLogs":
      case "eth_getProof":
      case "eth_getStorageAt":
      case "eth_getTransactionByBlockHashAndIndex":
      case "eth_getTransactionByBlockNumberAndIndex":
      case "eth_getTransactionByHash":
      case "eth_getTransactionCount":
      case "eth_getTransactionReceipt":
      case "eth_getUncleByBlockHashAndIndex":
      case "eth_getUncleByBlockNumberAndIndex":
      case "eth_getUncleCountByBlockHash":
      case "eth_getUncleCountByBlockNumber":
      case "eth_maxPriorityFeePerGas":
      case "eth_newBlockFilter":
      case "eth_newFilter":
      case "eth_newPendingTransactionFilter":
      case "eth_protocolVersion":
      case "eth_sendRawTransaction":
      case "eth_subscribe":
      case "eth_syncing":
      case "eth_uninstallFilter":
      case "eth_unsubscribe":
      case "net_listening":
      case "net_version":
      case "web3_clientVersion":
      case "web3_sha3":
        return this.chainService.send(
          method,
          params,
          await this.getCurrentOrDefaultNetworkForOrigin(origin)
        )
      case "eth_accounts": {
        // This is a special method, because Alchemy provider DO support it, but always return null (because they do not store keys.)
        const { address } = await this.preferenceService.getSelectedAccount()
        return [address]
      }
      case "eth_sendTransaction":
        return this.signTransaction(
          {
            ...(params[0] as JsonRpcTransactionRequest),
          },
          origin
        ).then(async (signed) => {
          await this.chainService.broadcastSignedTransaction(signed)
          return signed.hash
        })
      case "eth_signTransaction":
        return this.signTransaction(
          params[0] as JsonRpcTransactionRequest,
          origin
        ).then((signedTransaction) =>
          serializeEthersTransaction(
            ethersTransactionFromSignedTransaction(signedTransaction),
            {
              r: signedTransaction.r,
              s: signedTransaction.s,
              v: signedTransaction.v,
            }
          )
        )
      case "eth_sign": // --- important wallet methods ---
        return this.signData(
          {
            input: params[1] as string,
            account: params[0] as string,
          },
          origin
        )
      case "personal_sign":
        return this.signData(
          {
            input: params[0] as string,
            account: params[1] as string,
          },
          origin
        )
      // TODO - actually allow adding a new ethereum chain - for now wallet_addEthereumChain
      // will just switch to a chain if we already support it - but not add a new one
      case "wallet_addEthereumChain": {
        const chainInfo = params[0] as ValidatedAddEthereumChainParameter
        const { chainId } = chainInfo
        const supportedNetwork = await this.getTrackedNetworkByChainId(chainId)
        if (supportedNetwork) {
          await this.switchToSupportedNetwork(origin, supportedNetwork)
          this.emitter.emit("selectedNetwork", supportedNetwork)
          return null
        }
        if (!isEnabled(FeatureFlags.SUPPORT_CUSTOM_NETWORKS)) {
          // Dissallow adding new chains until feature flag is turned on.
          throw new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest)
        }
        try {
          const customNetwork = await this.chainService.addCustomChain(
            chainInfo
          )
          this.emitter.emit("selectedNetwork", customNetwork)
          return null
        } catch (e) {
          logger.error(e)
          throw new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest)
        }
      }
      case "wallet_switchEthereumChain": {
        const newChainId = (params[0] as SwitchEthereumChainParameter).chainId
        const supportedNetwork = await this.getTrackedNetworkByChainId(
          newChainId
        )
        if (supportedNetwork) {
          this.switchToSupportedNetwork(origin, supportedNetwork)
          return null
        }

        throw new EIP1193Error(EIP1193_ERROR_CODES.chainDisconnected)
      }
      case "metamask_getProviderState": // --- important MM only methods ---
      case "metamask_sendDomainMetadata":
      case "wallet_requestPermissions":
      case "wallet_watchAsset":
      case "estimateGas": // --- eip1193-bridge only method --
      case "eth_coinbase": // --- MM only methods ---
      case "eth_decrypt":
      case "eth_getEncryptionPublicKey":
      case "eth_getWork":
      case "eth_hashrate":
      case "eth_mining":
      case "eth_submitHashrate":
      case "eth_submitWork":
      case "metamask_accountsChanged":
      case "metamask_chainChanged":
      case "metamask_logWeb3ShimUsage":
      case "metamask_unlockStateChanged":
      case "metamask_watchAsset":
      case "net_peerCount":
      case "wallet_accountsChanged":
      case "wallet_registerOnboarding":
      default:
        throw new EIP1193Error(EIP1193_ERROR_CODES.unsupportedMethod)
    }
  }

  private async getCurrentInternalNetwork(): Promise<EVMNetwork> {
    return this.db.getCurrentNetworkForOrigin(
      TALLY_INTERNAL_ORIGIN
    ) as Promise<EVMNetwork>
  }

  async getCurrentOrDefaultNetworkForOrigin(
    origin: string
  ): Promise<EVMNetwork> {
    const currentNetwork = await this.db.getCurrentNetworkForOrigin(origin)
    if (!currentNetwork) {
      // If this is a new dapp or the dapp has not implemented wallet_switchEthereumChain
      // use the default network.
      const defaultNetwork = await this.getCurrentInternalNetwork()
      return defaultNetwork
    }
    return currentNetwork
  }

  async removePrefererencesForChain(chainId: string): Promise<void> {
    await this.db.removeStoredPreferencesForChain(chainId)
  }

  private async signTransaction(
    transactionRequest: JsonRpcTransactionRequest,
    origin: string
  ): Promise<SignedTransaction> {
    const annotation =
      origin === TALLY_INTERNAL_ORIGIN &&
      "annotation" in transactionRequest &&
      transactionRequest.annotation !== undefined
        ? // We use  `as` here as we know it's from a trusted source.
          (decodeJSON(transactionRequest.annotation) as TransactionAnnotation)
        : undefined

    const { from, ...convertedRequest } =
      transactionRequestFromEthersTransactionRequest({
        // Convert input -> data if necessary; if transactionRequest uses data
        // directly, it will be overwritten below. If someone sends both and
        // they differ, may devops199 have mercy on their soul (but we will
        // prefer the explicit `data` rather than the copied `input`).
        data: transactionRequest.input,
        ...transactionRequest,
        gasLimit: transactionRequest.gas, // convert gas -> gasLimit
      })

    if (typeof from === "undefined") {
      throw new Error("Transactions must have a from address for signing.")
    }

    const currentNetwork = await this.getCurrentOrDefaultNetworkForOrigin(
      origin
    )

    return new Promise<SignedTransaction>((resolve, reject) => {
      this.emitter.emit("transactionSignatureRequest", {
        payload: {
          ...convertedRequest,
          from,
          network: currentNetwork,
          annotation,
        },
        resolver: resolve,
        rejecter: reject,
      })
    })
  }

  /**
   * Attempts to retrieve a network from the extension's currently
   * tracked networks.  Falls back to querying supported networks and
   * tracking a given network if it is supported.
   *
   * @param chainID EVM Network chainID
   * @returns a supported EVMNetwork or undefined.
   */
  async getTrackedNetworkByChainId(
    chainID: string
  ): Promise<EVMNetwork | undefined> {
    const trackedNetworks = await this.chainService.getTrackedNetworks()
    const trackedNetwork = trackedNetworks.find((network) =>
      sameChainID(network.chainID, chainID)
    )

    if (trackedNetwork) {
      return trackedNetwork
    }

    try {
      const newlyTrackedNetwork =
        await this.chainService.startTrackingNetworkOrThrow(chainID)
      return newlyTrackedNetwork
    } catch (e) {
      logger.warn(e)
      return undefined
    }
  }

  private async signTypedData(params: SignTypedDataRequest) {
    return new Promise<string>((resolve, reject) => {
      this.emitter.emit("signTypedDataRequest", {
        payload: params,
        resolver: resolve,
        rejecter: reject,
      })
    })
  }

  async switchToSupportedNetwork(
    origin: string,
    supportedNetwork: EVMNetwork
  ): Promise<void> {
    const { address } = await this.preferenceService.getSelectedAccount()
    await this.chainService.markAccountActivity({
      address,
      network: supportedNetwork,
    })
    await this.db.setCurrentChainIdForOrigin(origin, supportedNetwork)
  }

  private async signData(
    {
      input,
      account,
    }: {
      input: string
      account: string
    },
    origin: string
  ) {
    const hexInput = input.match(/^0x[0-9A-Fa-f]*$/)
      ? input
      : hexlify(toUtf8Bytes(input))
    const typeAndData = parseSigningData(input)
    const currentNetwork = await this.getCurrentOrDefaultNetworkForOrigin(
      origin
    )

    return new Promise<string>((resolve, reject) => {
      this.emitter.emit("signDataRequest", {
        payload: {
          account: {
            address: account,
            network: currentNetwork,
          },
          rawSigningData: hexInput,
          ...typeAndData,
        },
        resolver: resolve,
        rejecter: reject,
      })
    })
  }
}
