import { normalizeHexAddress } from "@tallyho/hd-keyring"
import { AnyEVMTransaction, EVMNetwork } from "../../networks"
import { SmartContractFungibleAsset } from "../../assets"

import ChainService from "../chain"
import IndexingService from "../indexing"
import NameService from "../name"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import {
  EnrichedEVMTransaction,
  EnrichedEVMTransactionSignatureRequest,
  SignTypedDataAnnotation,
  EnrichedSignTypedDataRequest,
  PartialTransactionRequestWithFrom,
} from "./types"
import { SignTypedDataRequest } from "../../utils/signing"
import { enrichEIP2612SignTypedDataRequest, isEIP2612TypedData } from "./utils"
import { ETHEREUM } from "../../constants"

import resolveTransactionAnnotation from "./transactions"

export * from "./types"

interface Events extends ServiceLifecycleEvents {
  enrichedEVMTransaction: {
    transaction: EnrichedEVMTransaction
    forAccounts: string[]
  }
  enrichedEVMTransactionSignatureRequest: EnrichedEVMTransactionSignatureRequest
  enrichedSignTypedDataRequest: EnrichedSignTypedDataRequest
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
   * @param indexingService - Required for token metadata and currency
   * @param chainService - Required for chain interactions.
   * @param nameService - Required for name lookups.
   * @returns A new, initializing EnrichmentService
   */
  static create: ServiceCreatorFunction<
    Events,
    EnrichmentService,
    [Promise<ChainService>, Promise<IndexingService>, Promise<NameService>]
  > = async (chainService, indexingService, nameService) => {
    return new this(
      await chainService,
      await indexingService,
      await nameService
    )
  }

  private constructor(
    private chainService: ChainService,
    private indexingService: IndexingService,
    private nameService: NameService
  ) {
    super({})
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.connectChainServiceEvents()
  }

  private async connectChainServiceEvents(): Promise<void> {
    this.chainService.emitter.on(
      "transaction",
      async ({ transaction, forAccounts }) => {
        this.emitter.emit("enrichedEVMTransaction", {
          transaction: await this.enrichTransaction(
            transaction,
            2 /* TODO desiredDecimals should be configurable */
          ),
          forAccounts,
        })
      }
    )
  }

  async enrichTransactionSignature(
    network: EVMNetwork,
    transaction: PartialTransactionRequestWithFrom,
    desiredDecimals: number
  ): Promise<EnrichedEVMTransactionSignatureRequest> {
    const enrichedTxSignatureRequest = {
      ...transaction,
      network,
      annotation: await resolveTransactionAnnotation(
        this.chainService,
        this.indexingService,
        this.nameService,
        network,
        transaction,
        desiredDecimals
      ),
    }

    this.emitter.emit(
      "enrichedEVMTransactionSignatureRequest",
      enrichedTxSignatureRequest
    )

    return enrichedTxSignatureRequest
  }

  async enrichSignTypedDataRequest(
    signTypedDataRequest: SignTypedDataRequest
  ): Promise<EnrichedSignTypedDataRequest> {
    let annotation: SignTypedDataAnnotation = {
      type: "unrecognized",
    }
    const { typedData } = signTypedDataRequest
    if (isEIP2612TypedData(typedData)) {
      const assets = await this.indexingService.getCachedAssets(ETHEREUM)
      const correspondingAsset = assets.find(
        (asset): asset is SmartContractFungibleAsset => {
          if (
            typedData.domain.verifyingContract &&
            "contractAddress" in asset
          ) {
            return (
              normalizeHexAddress(asset.contractAddress) ===
              normalizeHexAddress(typedData.domain.verifyingContract)
            )
          }
          return false
        }
      )
      annotation = await enrichEIP2612SignTypedDataRequest(
        typedData,
        this.nameService,
        correspondingAsset
      )
    }

    const enrichedSignTypedDataRequest = {
      ...signTypedDataRequest,
      annotation,
    }

    this.emitter.emit(
      "enrichedSignTypedDataRequest",
      enrichedSignTypedDataRequest
    )

    return enrichedSignTypedDataRequest
  }

  async enrichTransaction(
    transaction: AnyEVMTransaction,
    desiredDecimals: number
  ): Promise<EnrichedEVMTransaction> {
    return {
      ...transaction,
      annotation: await resolveTransactionAnnotation(
        this.chainService,
        this.indexingService,
        this.nameService,
        transaction.network,
        transaction,
        desiredDecimals
      ),
    }
  }
}
