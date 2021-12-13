import {
  AnyAssetAmount,
  AnyAsset,
  SmartContractFungibleAsset,
  isSmartContractFungibleAsset,
} from "../../assets"
import { AnyEVMTransaction, Network } from "../../networks"
import { ETHEREUM } from "../../constants/networks"
import {
  AssetDecimalAmount,
  enrichAssetAmountWithDecimalValues,
} from "../../redux-slices/utils/asset-utils"

import { HexString, UNIXTime } from "../../types"
import { ERC20_INTERFACE } from "../../lib/erc20"

import ChainService from "../chain"
import IndexingService from "../indexing"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"

export type BaseContractInfo = {
  contractLogoURL?: string | undefined
}

export type ContractDeployment = BaseContractInfo & {
  type: "contract-deployment"
}

export type ContractInteraction = BaseContractInfo & {
  type: "contract-interaction"
}

export type AssetApproval = BaseContractInfo & {
  type: "asset-approval"
  assetAmount: AnyAssetAmount & AssetDecimalAmount
  spenderAddress: HexString
}

export type AssetTransfer = BaseContractInfo & {
  type: "asset-transfer"
  assetAmount: AnyAssetAmount & AssetDecimalAmount
  recipientAddress: HexString
}

export type AssetSwap = BaseContractInfo & {
  type: "asset-swap"
  fromAssetAmount: AnyAssetAmount & AssetDecimalAmount
  toAssetAmount: AnyAssetAmount & AssetDecimalAmount
}

export type ContractInfo =
  | ContractDeployment
  | ContractInteraction
  | AssetApproval
  | AssetTransfer
  | AssetSwap
  | undefined

export type ResolvedContractInfo = {
  contractInfo: ContractInfo
  address: HexString
  network: Network
  resolvedAt: UNIXTime
}

export type EnrichedEVMTransaction = AnyEVMTransaction & {
  contractInfo?: ContractInfo
}

interface Events extends ServiceLifecycleEvents {
  resolvedContractInfo: ResolvedContractInfo
  enrichedEVMTransaction: EnrichedEVMTransaction
}

/**
 * EnrichmentService is a coordinator service responsible for deciding when to
 * look up metadata about an application-level transaction, event, or address,
 * and annotating those entities for display UI.
 *
 * EnrichmentService acts primarily as a coordinator of ChainService,
 * IndexingService, and NameService to build annotations. It will need to
 * retrieve function selector and contract source code itself, but should
 * always prefer to delegate to a lower-lever service when possible.
 */
export default class EnrichmentService extends BaseService<Events> {
  /**
   * Create a new EnrichmentService. The service isn't initialized until
   * startService() is called and resolved.
   *
   * @param indexingService - Required for token metadata and currency
   * @param chainService - Required for chain interactions.
   * @returns A new, initializing EnrichmentService
   */
  static create: ServiceCreatorFunction<
    Events,
    EnrichmentService,
    [Promise<ChainService>, Promise<IndexingService>]
  > = async (chainService, indexingService) => {
    return new this(await chainService, await indexingService)
  }

  private constructor(
    private chainService: ChainService,
    private indexingService: IndexingService
  ) {
    super({})
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.connectChainServiceEvents()
  }

  private async connectChainServiceEvents(): Promise<void> {
    this.chainService.emitter.on("transaction", async ({ transaction }) => {
      this.enrichTransaction(
        transaction,
        2 /* TODO desiredDecimals should be configurable */
      )
    })
  }

  async resolveContractInfo(
    contractAddress: HexString | undefined,
    contractInput: HexString,
    desiredDecimals: number
  ): Promise<ContractInfo | undefined> {
    let contractInfo: ContractInfo | undefined
    // A missing recipient means a contract deployment.
    if (typeof contractAddress === "undefined") {
      contractInfo = {
        type: "contract-deployment",
      }
    } else {
      const assets = await this.indexingService.getCachedAssets()

      // See if the address matches a fungible asset.
      const matchingFungibleAsset = assets.find(
        (asset): asset is SmartContractFungibleAsset =>
          isSmartContractFungibleAsset(asset) &&
          asset.contractAddress.toLowerCase() === contractAddress.toLowerCase()
      )

      const contractLogoURL = matchingFungibleAsset?.metadata?.logoURL

      const erc20Tx = ERC20_INTERFACE.parseTransaction({ data: contractInput })

      // TODO handle the case where we don't have asset metadata already
      if (
        matchingFungibleAsset &&
        erc20Tx &&
        (erc20Tx.name === "transfer" || erc20Tx.name === "transferFrom")
      ) {
        // We have an ERC-20 transfer
        contractInfo = {
          type: "asset-transfer",
          contractLogoURL,
          recipientAddress: erc20Tx.args.to, // TODO ingest address
          assetAmount: enrichAssetAmountWithDecimalValues(
            {
              asset: matchingFungibleAsset,
              amount: BigInt(erc20Tx.args.amount),
            },
            desiredDecimals
          ),
        }
      } else if (
        matchingFungibleAsset &&
        erc20Tx &&
        erc20Tx.name === "approve"
      ) {
        contractInfo = {
          type: "asset-approval",
          contractLogoURL,
          spenderAddress: erc20Tx.args.spender, // TODO ingest address
          assetAmount: enrichAssetAmountWithDecimalValues(
            {
              asset: matchingFungibleAsset,
              amount: BigInt(erc20Tx.args.amount),
            },
            desiredDecimals
          ),
        }
      } else {
        // Fall back on a standard contract interaction.
        contractInfo = {
          type: "contract-interaction",
          // Include the logo URL if we resolve it even if the interaction is
          // non-specific; the UI can choose to use it or not, but if we know the
          // address has an associated logo it's worth passing on.
          contractLogoURL,
        }
      }

      this.emitter.emit("resolvedContractInfo", {
        contractInfo,
        resolvedAt: Date.now(),
        network: ETHEREUM, // TODO make multi-chain compatible
        address: contractAddress,
      })
    }

    return contractInfo
  }

  async enrichTransaction(
    transaction: AnyEVMTransaction,
    desiredDecimals: number
  ): Promise<EnrichedEVMTransaction> {
    if (transaction.input === null || transaction.input === "0x") {
      // This is _almost certainly_ not a contract interaction, move on. Note that
      // a simple ETH send to a contract address can still effectively be a
      // contract interaction (because it calls the fallback function on the
      // contract), but for now we deliberately ignore that scenario when
      // categorizing activities.
      return transaction
    }
    const enrichedTx = {
      ...transaction,
      contractInfo: await this.resolveContractInfo(
        transaction.to,
        transaction.input,
        desiredDecimals
      ),
    }

    this.emitter.emit("enrichedEVMTransaction", enrichedTx)

    return enrichedTx
  }
}
