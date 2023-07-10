import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EVMLog,
  EVMNetwork,
  isEIP1559TransactionRequest,
} from "../../networks"
import {
  SmartContractFungibleAsset,
  isSmartContractFungibleAsset,
} from "../../assets"
import { enrichAssetAmountWithDecimalValues } from "../../redux-slices/utils/asset-utils"

import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"

import ChainService from "../chain"
import IndexingService from "../indexing"
import NameService from "../name"
import {
  TransactionAnnotation,
  PartialTransactionRequestWithFrom,
  EnrichedEVMTransactionRequest,
  EnrichedAddressOnNetwork,
  AssetTransfer,
} from "./types"
import { getERC20LogsForAddresses } from "./utils"
import { enrichAddressOnNetwork } from "./addresses"
import { OPTIMISM } from "../../constants"
import { parseLogsForWrappedDepositsAndWithdrawals } from "../../lib/wrappedAsset"
import { parseERC20Tx, parseLogsForERC20Transfers } from "../../lib/erc20"
import { isDefined } from "../../lib/utils/type-guards"
import { unsignedTransactionFromEVMTransaction } from "../chain/utils"
import { AddressOnNetwork } from "../../accounts"

const txHasLogs = <T extends Partial<AnyEVMTransaction>>(
  tx: T
): tx is T & { logs: EVMLog[] } =>
  "logs" in tx && typeof tx.logs !== "undefined"

const txHasRecipient = <T extends Partial<AnyEVMTransaction>>(
  tx: T
): tx is T & { to: string } => typeof tx.to !== "undefined"

const txHasInput = <T extends Partial<AnyEVMTransaction>>(
  transaction: T
): transaction is T & { input: string } =>
  transaction.input !== null &&
  transaction.input !== "0x" &&
  typeof transaction.input !== "undefined"

const getERC20TxData = (tx: Partial<AnyEVMTransaction>) => {
  const erc20Tx = txHasInput(tx) && parseERC20Tx(tx.input)

  if (erc20Tx) {
    switch (erc20Tx.name) {
      case "transfer":
      case "transferFrom":
        return {
          type: erc20Tx.name,
          from: erc20Tx.args.from,
          to: erc20Tx.args.to,
          amount: erc20Tx.args.amount,
        }
      case "approve":
        return {
          type: erc20Tx.name,
          spender: erc20Tx.args.to,
          amount: erc20Tx.args.value,
        }
      default:
        break
    }
  }
  return undefined
}

export async function parseTransactionLogs(
  chainService: ChainService,
  indexingService: IndexingService,
  logs: EVMLog[],
  network: EVMNetwork,
  desiredDecimals: number,
  resolvedTime: number,
  block: AnyEVMBlock | undefined
): Promise<
  {
    type: "asset-transfer"
    assetAmount: AssetTransfer["assetAmount"]
    sender: AddressOnNetwork
    recipient: AddressOnNetwork
    timestamp: number
    blockTimestamp: number | undefined
  }[]
> {
  const assets = indexingService.getCachedAssets(network)

  const accountAddresses = (await chainService.getAccountsToTrack()).map(
    (account) => account.address
  )

  const tokenTransferLogs = [
    ...parseLogsForERC20Transfers(logs),
    ...parseLogsForWrappedDepositsAndWithdrawals(logs),
  ]

  const relevantTransferLogs = getERC20LogsForAddresses(
    tokenTransferLogs,
    accountAddresses
  ).filter(({ contractAddress }) => {
    const matchingFungibleAsset = assets.some(
      (asset): asset is SmartContractFungibleAsset =>
        isSmartContractFungibleAsset(asset) &&
        sameEVMAddress(asset.contractAddress, contractAddress)
    )

    return matchingFungibleAsset
  })

  const subannotations = relevantTransferLogs
    .map(({ contractAddress, amount, senderAddress, recipientAddress }) => {
      // See if the address matches a fungible asset.
      const matchingFungibleAsset = assets.find(
        (asset): asset is SmartContractFungibleAsset =>
          isSmartContractFungibleAsset(asset) &&
          sameEVMAddress(asset.contractAddress, contractAddress)
      )

      if (!matchingFungibleAsset) {
        return undefined
      }

      return {
        type: "asset-transfer" as const,
        assetAmount: enrichAssetAmountWithDecimalValues(
          {
            asset: matchingFungibleAsset,
            amount,
          },
          desiredDecimals
        ),
        sender: { address: normalizeEVMAddress(senderAddress), network },
        recipient: {
          address: normalizeEVMAddress(recipientAddress),
          network,
        },
        timestamp: resolvedTime,
        blockTimestamp: block?.timestamp,
      }
    })
    .filter(isDefined)

  return subannotations
}

/**
 * Resolve an annotation for a partial transaction request, or a pending
 * or mined transaction.
 */
export default async function resolveTransactionAnnotation(
  chainService: ChainService,
  indexingService: IndexingService,
  nameService: NameService,
  network: EVMNetwork,
  transaction:
    | AnyEVMTransaction
    | (PartialTransactionRequestWithFrom & {
        blockHash?: string
      })
    | (EnrichedEVMTransactionRequest & {
        blockHash?: string
      }),
  desiredDecimals: number
): Promise<TransactionAnnotation> {
  const assets = await indexingService.getCachedAssets(network)
  const trackedAddresses = (await chainService.getAccountsToTrack()).map(
    (account) => account.address
  )
  const isFromTrackedAddress = trackedAddresses.includes(transaction.from)
  const hasRecipient = txHasRecipient(transaction)
  const hasInput = txHasInput(transaction)

  // See if the address matches a fungible asset.
  const knownAssetForERC20Tx =
    hasRecipient &&
    hasInput &&
    assets.find(
      (asset): asset is SmartContractFungibleAsset =>
        isSmartContractFungibleAsset(asset) &&
        sameEVMAddress(asset.contractAddress, transaction.to)
    )

  const knownERC20TxData = knownAssetForERC20Tx && getERC20TxData(transaction)

  const enrichMap: Record<string, Promise<EnrichedAddressOnNetwork>> = {}
  /**
   * Adds an address to the enrichment map and kicks off enrichment
   * in the background
   */
  const requestEnrichment = (rawAddress: string) => {
    const address = normalizeEVMAddress(rawAddress)

    enrichMap[address] ??= enrichAddressOnNetwork(chainService, nameService, {
      address,
      network,
    })
  }

  let block: AnyEVMBlock | undefined

  // By default, annotate all requests as contract interactions, unless they
  // already carry additional metadata.
  let txAnnotation: TransactionAnnotation =
    "annotation" in transaction && transaction.annotation !== undefined
      ? transaction.annotation
      : {
          blockTimestamp: undefined,
          timestamp: Date.now(),
          type: "contract-deployment",
          transactionLogoURL: assets.find(
            (asset) =>
              asset.metadata?.logoURL &&
              asset.symbol === transaction.network.baseAsset.symbol
          )?.metadata?.logoURL,
        }

  const txLogs = txHasLogs(transaction)
    ? await parseTransactionLogs(
        chainService,
        indexingService,
        transaction.logs,
        network,
        desiredDecimals,
        txAnnotation.timestamp,
        block
      )
    : []

  // Look up logs and parse subannotations, if available.
  txLogs.forEach((log) => {
    requestEnrichment(log.sender.address)
    requestEnrichment(log.recipient.address)
  })

  const { gasLimit, blockHash } = transaction

  // Only run for non completed transactions
  if (!blockHash && isFromTrackedAddress) {
    const {
      assetAmount: { amount: baseAssetBalance },
    } = await chainService.getLatestBaseAccountBalance({
      address: transaction.from,
      network,
    })

    const additionalL1Gas =
      network.chainID === OPTIMISM.chainID
        ? await chainService.estimateL1RollupFeeForOptimism(
            network,
            unsignedTransactionFromEVMTransaction(transaction)
          )
        : 0n

    const gasFee: bigint = isEIP1559TransactionRequest(transaction)
      ? (transaction?.maxFeePerGas ?? 0n) * (gasLimit ?? 0n) + additionalL1Gas
      : (("gasPrice" in transaction && transaction?.gasPrice) || 0n) *
          (gasLimit ?? 0n) +
        additionalL1Gas

    txAnnotation.warnings ??= []

    // If the wallet doesn't have enough base asset to cover gas, push a warning
    if (gasFee + (transaction.value ?? 0n) > baseAssetBalance) {
      if (!txAnnotation.warnings.includes("insufficient-funds")) {
        txAnnotation.warnings.push("insufficient-funds")
      }
    } else {
      txAnnotation.warnings = txAnnotation.warnings.filter(
        (warning) => warning !== "insufficient-funds"
      )
    }
  } else if (blockHash) {
    // If the transaction has been mined, get the block and set the timestamp
    block = await chainService.getBlockData(network, blockHash)
    txAnnotation = {
      ...txAnnotation,
      blockTimestamp: block?.timestamp,
    }
  }

  if (hasRecipient) {
    requestEnrichment(transaction.to)
    requestEnrichment(transaction.from)

    if (knownERC20TxData) {
      switch (knownERC20TxData.type) {
        case "transfer":
        case "transferFrom":
          requestEnrichment(knownERC20TxData.from ?? transaction.from)
          requestEnrichment(knownERC20TxData.to)
          break
        case "approve":
          requestEnrichment(knownERC20TxData.spender)
          break
        default:
          break
      }
    }
  }

  // If the tx has a recipient, its a contract interaction or another tx type
  // rather than a deployment.
  if (hasRecipient) {
    const [recipientInfo, sender] = await Promise.all([
      enrichMap[normalizeEVMAddress(transaction.to)],
      enrichMap[normalizeEVMAddress(transaction.from)],
    ])

    // For prepopulated swap annotations, resolve the swap contract info.
    if (txAnnotation.type === "asset-swap") {
      txAnnotation = {
        ...txAnnotation,
        swapContractInfo: recipientInfo,
      }
    } else if (txAnnotation.type === "contract-deployment") {
      txAnnotation = {
        ...txAnnotation,
        type: "contract-interaction",
        contractInfo: recipientInfo,
      }
    }

    if (!hasInput) {
      // If the tx has no data, it's either a simple ETH send, or it's relying
      // on a contract that's `payable` to execute code

      // This is _almost certainly_ not a contract interaction, move on. Note that
      // a simple ETH send to a contract address can still effectively be a
      // contract interaction (because it calls the fallback function on the
      // contract), but for now we deliberately ignore that scenario when
      // categorizing activities.
      // TODO We can do more here by checking how much gas was spent. Anything
      // over the 21k required to send ETH is a more complex contract interaction
      if (typeof transaction.value !== "undefined") {
        // Warn if we're sending ETH to a contract. This is normal if you're
        // funding a multisig or exchange, but it's good to double check
        // If the annotation is a built-in contract or in the address book,
        // skip the warning.
        if (
          recipientInfo.annotation.hasCode &&
          !(
            recipientInfo.annotation.nameRecord?.system ===
              "tally-known-contracts" ||
            recipientInfo.annotation.nameRecord?.system === "tally-address-book"
          )
        ) {
          txAnnotation.warnings ??= []
          txAnnotation.warnings.push("send-to-contract")
        }

        txAnnotation = {
          ...txAnnotation,
          type: "asset-transfer",
          sender,
          recipient: recipientInfo,
          assetAmount: enrichAssetAmountWithDecimalValues(
            {
              asset: network.baseAsset,
              amount: transaction.value,
            },
            desiredDecimals
          ),
        }
      }
    } else if (knownERC20TxData) {
      const transactionLogoURL = knownAssetForERC20Tx?.metadata?.logoURL

      // TODO handle the case where we don't have asset metadata already
      if (
        knownERC20TxData.type === "transfer" ||
        knownERC20TxData.type === "transferFrom"
      ) {
        const [erc20Sender, recipient] = await Promise.all([
          enrichMap[
            normalizeEVMAddress(knownERC20TxData.from ?? transaction.from)
          ],
          enrichMap[normalizeEVMAddress(knownERC20TxData.to)],
        ])

        // We have an ERC-20 transfer
        txAnnotation = {
          ...txAnnotation,
          type: "asset-transfer",
          transactionLogoURL,
          sender: erc20Sender,
          recipient,
          assetAmount: enrichAssetAmountWithDecimalValues(
            {
              asset: knownAssetForERC20Tx,
              amount: BigInt(knownERC20TxData.amount),
            },
            desiredDecimals
          ),
        }
        // Warn if we're sending the token to its own contract
        if (sameEVMAddress(knownERC20TxData.to, transaction.to)) {
          txAnnotation.warnings ??= []
          txAnnotation.warnings.push("send-to-token")
        }
        // Warn if we're sending the token to a contract. This is normal if
        // you're funding a multisig or exchange, but it's good to double check.
        // If the annotation is a built-in contract or in the address book,
        // skip the warning.
        if (
          recipient.annotation.hasCode &&
          !(
            recipient.annotation.nameRecord?.system ===
              "tally-known-contracts" ||
            recipient.annotation.nameRecord?.system === "tally-address-book"
          )
        ) {
          txAnnotation.warnings ??= []
          txAnnotation.warnings.push("send-to-contract")
        }
      } else if (knownERC20TxData.type === "approve") {
        const spender = await enrichMap[
          normalizeEVMAddress(knownERC20TxData.spender)
        ]

        // Warn if we're approving spending to a likely EOA. Note this will also
        // sweep up CREATE2 contracts that haven't yet been deployed
        if (!spender.annotation.hasCode) {
          txAnnotation.warnings ??= []
          txAnnotation.warnings.push("approve-eoa")
        }
        txAnnotation = {
          ...txAnnotation,
          type: "asset-approval",
          transactionLogoURL,
          spender,
          assetAmount: enrichAssetAmountWithDecimalValues(
            {
              asset: knownAssetForERC20Tx,
              amount: BigInt(knownERC20TxData.amount),
            },
            desiredDecimals
          ),
        }
      }
    }

    if (txLogs.length > 0) {
      txAnnotation.subannotations = await Promise.all(
        txLogs.map(async (log) => ({
          ...log,
          sender: await enrichMap[log.sender.address],
          recipient: await enrichMap[log.recipient.address],
        }))
      )
    }
  }

  return txAnnotation
}
