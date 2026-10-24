import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import { serialize as serializeEthersTransaction } from "@ethersproject/transactions"

import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  RPCRequest,
} from "@tallyho/provider-bridge-shared"
import { hexlify, toUtf8Bytes, _TypedDataEncoder } from "ethers/lib/utils"
import { normalizeHexAddress } from "@tallyho/hd-keyring"

import logger from "../../lib/logger"

import BaseService from "../base"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
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
import { TAHO_INTERNAL_ORIGIN } from "./constants"
import { ROOTSTOCK } from "../../constants"
import {
  EnrichedEVMTransactionRequest,
  TransactionAnnotation,
} from "../enrichment"
import type { ValidatedAddEthereumChainParameter } from "../provider-bridge/utils"
import {
  isValidChecksumAddress,
  isMixedCaseAddress,
  decodeJSON,
} from "../../lib/utils"

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

type RPCHandler = (
  method: string,
  params: RPCRequest["params"],
  origin: string,
) => Promise<unknown>

export type InternalProviderRPCMethod =
  keyof InternalEthereumProviderService["rpcHandlers"]

// https://eips.ethereum.org/EIPS/eip-3326
export type SwitchEthereumChainParameter = {
  chainId: string
}

// https://eips.ethereum.org/EIPS/eip-747
type WatchAssetParameters = {
  type: string // The asset's interface, e.g. 'ERC1046'
  options: WatchAssetOptions
}

type WatchAssetOptions = {
  address: string // The hexadecimal address of the token contract
  chainId?: number // The chain ID of the asset. If empty, defaults to the current chain ID.
  // Fields such as symbol and name can be present here as well - but lets just fetch them from the contract
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
      broadcastOnSign: boolean
    },
    SignedTransaction
  >
  signTypedDataRequest: DAppRequestEvent<SignTypedDataRequest, string>
  signDataRequest: DAppRequestEvent<MessageSigningRequest, string>
  selectedNetwork: EVMNetwork
  watchAssetRequest: { contractAddress: string; network: EVMNetwork }
  networkSwitchedForOrigin: { origin: string; network: EVMNetwork }
  // connect
  // disconnect
  // account change
  // networkchange
}

export default class InternalEthereumProviderService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    InternalEthereumProviderService,
    [Promise<ChainService>, Promise<PreferenceService>]
  > = async (chainService, preferenceService) =>
    new this(await getOrCreateDB(), await chainService, await preferenceService)

  private constructor(
    private db: InternalEthereumProviderDatabase,
    private chainService: ChainService,
    private preferenceService: PreferenceService,
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
            TAHO_INTERNAL_ORIGIN,
          ),
        }
        logger.debug("internal response:", response)

        internalProviderPort.postResponse(response)
      } catch (error) {
        logger.debug("error processing request", event.id, error)

        internalProviderPort.postResponse({
          id: event.id,
          result: new EIP1193Error(
            EIP1193_ERROR_CODES.userRejectedRequest,
          ).toJSON(),
        })
      }
    })
  }

  private readonly passthroughRPCRequest: RPCHandler = async (
    method,
    params,
    origin,
  ) =>
    this.chainService.send(
      method,
      params,
      await this.getCurrentOrDefaultNetworkForOrigin(origin),
    )

  private readonly signTypedDataRPCRequest: RPCHandler = async (
    _,
    params,
    origin,
  ) =>
    this.signTypedData({
      account: {
        address: params[0] as string,
        network: await this.getCurrentOrDefaultNetworkForOrigin(origin),
      },
      typedData: JSON.parse(params[1] as string),
    })

  private readonly rpcHandlers = {
    // supported alchemy methods: https://docs.alchemy.com/alchemy/apis/ethereum
    eth_signTypedData: this.signTypedDataRPCRequest,
    eth_signTypedData_v1: this.signTypedDataRPCRequest,
    eth_signTypedData_v3: this.signTypedDataRPCRequest,
    eth_signTypedData_v4: this.signTypedDataRPCRequest,
    eth_chainId: async (_, __, origin) =>
      toHexChainID(
        (await this.getCurrentOrDefaultNetworkForOrigin(origin)).chainID,
      ),
    eth_blockNumber: this.passthroughRPCRequest,
    eth_call: this.passthroughRPCRequest,
    eth_estimateGas: this.passthroughRPCRequest,
    eth_feeHistory: this.passthroughRPCRequest,
    eth_gasPrice: this.passthroughRPCRequest,
    eth_getBalance: this.passthroughRPCRequest,
    eth_getBlockByHash: this.passthroughRPCRequest,
    eth_getBlockByNumber: this.passthroughRPCRequest,
    eth_getBlockTransactionCountByHash: this.passthroughRPCRequest,
    eth_getBlockTransactionCountByNumber: this.passthroughRPCRequest,
    eth_getCode: this.passthroughRPCRequest,
    eth_getFilterChanges: this.passthroughRPCRequest,
    eth_getFilterLogs: this.passthroughRPCRequest,
    eth_getLogs: this.passthroughRPCRequest,
    eth_getProof: this.passthroughRPCRequest,
    eth_getStorageAt: this.passthroughRPCRequest,
    eth_getTransactionByBlockHashAndIndex: this.passthroughRPCRequest,
    eth_getTransactionByBlockNumberAndIndex: this.passthroughRPCRequest,
    eth_getTransactionByHash: this.passthroughRPCRequest,
    eth_getTransactionCount: this.passthroughRPCRequest,
    eth_getTransactionReceipt: this.passthroughRPCRequest,
    eth_getUncleByBlockHashAndIndex: this.passthroughRPCRequest,
    eth_getUncleByBlockNumberAndIndex: this.passthroughRPCRequest,
    eth_getUncleCountByBlockHash: this.passthroughRPCRequest,
    eth_getUncleCountByBlockNumber: this.passthroughRPCRequest,
    eth_maxPriorityFeePerGas: this.passthroughRPCRequest,
    eth_newBlockFilter: this.passthroughRPCRequest,
    eth_newFilter: this.passthroughRPCRequest,
    eth_newPendingTransactionFilter: this.passthroughRPCRequest,
    eth_protocolVersion: this.passthroughRPCRequest,
    eth_sendRawTransaction: this.passthroughRPCRequest,
    eth_subscribe: this.passthroughRPCRequest,
    eth_syncing: this.passthroughRPCRequest,
    eth_uninstallFilter: this.passthroughRPCRequest,
    eth_unsubscribe: this.passthroughRPCRequest,
    net_listening: this.passthroughRPCRequest,
    net_version: this.passthroughRPCRequest,
    web3_clientVersion: this.passthroughRPCRequest,
    web3_sha3: this.passthroughRPCRequest,
    eth_accounts: async () => {
      const { address } = await this.preferenceService.getSelectedAccount()
      return [address]
    },
    eth_sendTransaction: async (_, params, origin) =>
      this.signTransaction(
        {
          ...(params[0] as JsonRpcTransactionRequest),
        },
        origin,
        true,
      ).then(async (signed) => {
        await this.chainService.broadcastSignedTransaction(signed)
        return signed.hash
      }),
    eth_signTransaction: async (_, params, origin) =>
      this.signTransaction(
        params[0] as JsonRpcTransactionRequest,
        origin,
        false,
      ).then((signedTransaction) =>
        serializeEthersTransaction(
          ethersTransactionFromSignedTransaction(signedTransaction),
          {
            r: signedTransaction.r,
            s: signedTransaction.s,
            v: signedTransaction.v,
          },
        ),
      ),
    // --- important wallet methods ---
    eth_sign: async (_, params, origin) =>
      this.signData(
        {
          input: params[1] as string,
          account: params[0] as string,
        },
        origin,
      ),
    personal_sign: async (_, params, origin) =>
      this.signData(
        {
          input: params[0] as string,
          account: params[1] as string,
        },
        origin,
      ),
    wallet_addEthereumChain: async (_, params, origin) => {
      const chainInfo = params[0] as ValidatedAddEthereumChainParameter
      const { chainId } = chainInfo
      const supportedNetwork = await this.getTrackedNetworkByChainId(chainId)
      if (supportedNetwork) {
        await this.switchToSupportedNetwork(origin, supportedNetwork)
        this.emitter.emit("selectedNetwork", supportedNetwork)
        return null
      }
      try {
        const customNetwork = await this.chainService.addCustomChain(chainInfo)
        this.emitter.emit("selectedNetwork", customNetwork)
        return null
      } catch (e) {
        logger.error(e)
        throw new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest)
      }
    },
    wallet_switchEthereumChain: async (_, params, origin) => {
      const newChainId = (params[0] as SwitchEthereumChainParameter).chainId
      const supportedNetwork = await this.getTrackedNetworkByChainId(newChainId)
      if (supportedNetwork) {
        // Only report success once the switch is persisted, so a dapp that
        // asks for eth_chainId right away sees the new chain.
        await this.switchToSupportedNetwork(origin, supportedNetwork)
        return null
      }

      throw new EIP1193Error(EIP1193_ERROR_CODES.unrecognizedChainId)
    },
    wallet_watchAsset: async (_, params, origin) => {
      const { type, options } = params[0]
        ? (params[0] as WatchAssetParameters)
        : // some dapps send the object directly instead of an array
          (params as unknown as WatchAssetParameters)
      if (type !== "ERC20") {
        throw new EIP1193Error(EIP1193_ERROR_CODES.unsupportedMethod)
      }

      if (options.chainId) {
        const supportedNetwork = await this.getTrackedNetworkByChainId(
          String(options.chainId),
        )
        if (!supportedNetwork) {
          throw new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest)
        }
        this.emitter.emit("watchAssetRequest", {
          contractAddress: normalizeHexAddress(options.address),
          network: supportedNetwork,
        })
        return true
      }

      // if chainID is not specified, we assume the current network - as per EIP-747
      const network = await this.getCurrentOrDefaultNetworkForOrigin(origin)

      this.emitter.emit("watchAssetRequest", {
        contractAddress: normalizeHexAddress(options.address),
        network,
      })
      return true
    },
  } satisfies Record<string, RPCHandler>

  isSupportedRPCMethod(method: string): method is InternalProviderRPCMethod {
    return Object.hasOwn(this.rpcHandlers, method)
  }

  async routeSafeRPCRequest(
    method: string,
    params: RPCRequest["params"],
    origin: string,
  ): Promise<unknown> {
    if (!this.isSupportedRPCMethod(method)) {
      // Among others, this covers MetaMask-only methods
      // (metamask_getProviderState, eth_decrypt, eth_getEncryptionPublicKey,
      // ...), PoW-era methods (eth_getWork, eth_hashrate, eth_mining, ...),
      // wallet_requestPermissions (handled by the provider bridge) and newer
      // wallet methods like wallet_getCapabilities and wallet_sendCalls.
      throw new EIP1193Error(EIP1193_ERROR_CODES.unsupportedMethod)
    }

    return this.rpcHandlers[method](method, params, origin)
  }

  private async getCurrentInternalNetwork(): Promise<EVMNetwork> {
    return this.db.getCurrentNetworkForOrigin(
      TAHO_INTERNAL_ORIGIN,
    ) as Promise<EVMNetwork>
  }

  async getCurrentOrDefaultNetworkForOrigin(
    origin: string,
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

  async removePreferencesForChain(chainId: string): Promise<void> {
    await this.db.removeStoredPreferencesForChain(chainId)
  }

  private async signTransaction(
    transactionRequest: JsonRpcTransactionRequest,
    origin: string,
    broadcastOnSign: boolean,
  ): Promise<SignedTransaction> {
    const annotation =
      origin === TAHO_INTERNAL_ORIGIN &&
      "annotation" in transactionRequest &&
      transactionRequest.annotation !== undefined
        ? // We use  `as` here as we know it's from a trusted source.
          (decodeJSON(transactionRequest.annotation) as TransactionAnnotation)
        : undefined

    if (!transactionRequest.from) {
      throw new Error("Transactions must have a from address for signing.")
    }

    const currentNetwork =
      await this.getCurrentOrDefaultNetworkForOrigin(origin)

    const isRootstock = currentNetwork.chainID === ROOTSTOCK.chainID

    if (isRootstock) {
      const transactionAddresses = [
        transactionRequest.from,
        transactionRequest.to,
      ]
      transactionAddresses.forEach((address) => {
        if (
          address &&
          isMixedCaseAddress(address) &&
          !isValidChecksumAddress(address, +currentNetwork.chainID)
        ) {
          throw new Error("Bad address checksum")
        }
      })
    }

    const { from, ...convertedRequest } =
      transactionRequestFromEthersTransactionRequest({
        // Convert input -> data if necessary; if transactionRequest uses data
        // directly, it will be overwritten below. If someone sends both and
        // they differ, may devops199 have mercy on their soul (but we will
        // prefer the explicit `data` rather than the copied `input`).
        data: transactionRequest.input,
        ...transactionRequest,
        gasLimit: transactionRequest.gas, // convert gas -> gasLimit
        // Etherjs rejects Rootstock checksummed addresses so convert to lowercase
        from: isRootstock
          ? normalizeHexAddress(transactionRequest.from)
          : transactionRequest.from,
        to: isRootstock
          ? transactionRequest.to && normalizeHexAddress(transactionRequest.to)
          : transactionRequest.to,
      })

    if (typeof from === "undefined") {
      throw new Error("Transactions must have a from address for signing.")
    }

    return new Promise<SignedTransaction>((resolve, reject) => {
      this.emitter.emit("transactionSignatureRequest", {
        payload: {
          ...convertedRequest,
          from,
          network: currentNetwork,
          annotation,
          broadcastOnSign,
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
    chainID: string,
  ): Promise<EVMNetwork | undefined> {
    const trackedNetworks = await this.chainService.getTrackedNetworks()
    const trackedNetwork = trackedNetworks.find((network) =>
      sameChainID(network.chainID, chainID),
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
    // Ethers does not want to see the EIP712Domain field, extract it.
    const { EIP712Domain, ...typesForSigning } = params.typedData.types

    // Ask Ethers to give us a filtered payload that only includes types
    // specified in the `types` object.
    const filteredTypedDataPayload = _TypedDataEncoder.getPayload(
      params.typedData.domain,
      typesForSigning,
      params.typedData.message,
    )

    const filteredRequest = {
      ...params,
      typedData: {
        ...filteredTypedDataPayload,
        types: {
          // If there was an EIP712Domain field in the `types`, pass it along.
          ...(EIP712Domain === undefined ? {} : { EIP712Domain }),
          ...filteredTypedDataPayload.types,
        },
      },
    }

    return new Promise<string>((resolve, reject) => {
      this.emitter.emit("signTypedDataRequest", {
        payload: filteredRequest,
        resolver: resolve,
        rejecter: reject,
      })
    })
  }

  async switchToSupportedNetwork(
    origin: string,
    supportedNetwork: EVMNetwork,
  ): Promise<void> {
    await this.db.setCurrentChainIdForOrigin(origin, supportedNetwork)
    this.emitter.emit("networkSwitchedForOrigin", {
      origin,
      network: supportedNetwork,
    })
  }

  /**
   * Clears the current network for the given origin if and only if it matches
   * the passed chain id.
   *
   * If the origin has a different chain id set as the current network, the
   * current network will be left in place.
   */
  async unsetCurrentNetworkForOrigin(
    origin: string,
    chainId: string,
  ): Promise<void> {
    await this.db.unsetCurrentNetworkForOrigin(origin, chainId)
  }

  private async signData(
    {
      input,
      account,
    }: {
      input: string
      account: string
    },
    origin: string,
  ) {
    const hexInput = input.match(/^0x[0-9A-Fa-f]*$/)
      ? input
      : hexlify(toUtf8Bytes(input))
    const typeAndData = parseSigningData(input)
    const currentNetwork =
      await this.getCurrentOrDefaultNetworkForOrigin(origin)

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
