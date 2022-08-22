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
} from "./types"
import {
  getDistinctRecipentAddressesFromERC20Logs,
  getERC20LogsForAddresses,
} from "./utils"
import { enrichAddressOnNetwork } from "./addresses"
import { EnrichmentDatabase } from "./db"
import { EVM_ROLLUP_CHAIN_IDS } from "../../constants"
import { parseLogsForWrappedDepositsAndWithdrawals } from "../../lib/wrappedAsset"
import { parseERC20Tx, parseLogsForERC20Transfers } from "../../lib/erc20"
import { lookupFunctionSelector } from "../../lib/four-byte"
import { isDefined, isFulfilledPromise } from "../../lib/utils/type-guards"

async function annotationsFromLogs(
  chainService: ChainService,
  indexingService: IndexingService,
  nameService: NameService,
  logs: EVMLog[],
  network: EVMNetwork,
  desiredDecimals: number,
  resolvedTime: number,
  block: AnyEVMBlock | undefined
): Promise<TransactionAnnotation[]> {
  const assets = await indexingService.getCachedAssets(network)

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
  )
  const relevantAddresses = [
    ...new Set(
      getDistinctRecipentAddressesFromERC20Logs(relevantTransferLogs)
        .concat(
          tokenTransferLogs.flatMap<string>(
            ({ senderAddress, recipientAddress }) => [
              senderAddress,
              recipientAddress,
            ]
          )
        )
        .map(normalizeEVMAddress)
    ),
  ]

  // Look up transfer log names, then flatten to an address -> name map.
  const annotationsByAddress = Object.fromEntries(
    (
      await Promise.allSettled(
        relevantAddresses.map(
          async (address) =>
            [
              address,
              await enrichAddressOnNetwork(chainService, nameService, {
                address,
                network,
              }),
            ] as const
        )
      )
    )
      .filter(isFulfilledPromise)
      .map(({ value }) => value)
      .filter(([, annotation]) => isDefined(annotation))
  )

  const subannotations = tokenTransferLogs.flatMap<TransactionAnnotation>(
    ({ contractAddress, amount, senderAddress, recipientAddress }) => {
      // See if the address matches a fungible asset.
      const matchingFungibleAsset = assets.find(
        (asset): asset is SmartContractFungibleAsset =>
          isSmartContractFungibleAsset(asset) &&
          sameEVMAddress(asset.contractAddress, contractAddress)
      )

      if (!matchingFungibleAsset) {
        return []
      }

      // Try to find a resolved annotation for the recipient and sender
      const recipient =
        annotationsByAddress[normalizeEVMAddress(recipientAddress)]
      const sender = annotationsByAddress[normalizeEVMAddress(senderAddress)]

      return [
        {
          type: "asset-transfer",
          assetAmount: enrichAssetAmountWithDecimalValues(
            {
              asset: matchingFungibleAsset,
              amount,
            },
            desiredDecimals
          ),
          sender,
          recipient,
          timestamp: resolvedTime,
          blockTimestamp: block?.timestamp,
        },
      ]
    }
  )

  return subannotations
}

/**
 * Resolve an annotation for a partial transaction request, or a pending
 * or mined transaction.
 */
export default async function resolveTransactionAnnotation(
  db: EnrichmentDatabase,
  chainService: ChainService,
  indexingService: IndexingService,
  nameService: NameService,
  network: EVMNetwork,
  transaction:
    | AnyEVMTransaction
    | (PartialTransactionRequestWithFrom & {
        blockHash?: string
      }),
  desiredDecimals: number
): Promise<TransactionAnnotation> {
  // By default, annotate all requests as contract interactions
  let txAnnotation: TransactionAnnotation = {
    blockTimestamp: undefined,
    timestamp: Date.now(),
    type: "contract-interaction",
  }

  let block: AnyEVMBlock | undefined

  const {
    assetAmount: { amount: baseAssetBalance },
  } = await chainService.getLatestBaseAccountBalance({
    address: transaction.from,
    network,
  })

  const { gasLimit, blockHash } = transaction

  const additionalL1Gas = EVM_ROLLUP_CHAIN_IDS.has(network.chainID)
    ? await chainService.estimateL1RollupFee(network, transaction.input)
    : 0n

  const gasFee: bigint = isEIP1559TransactionRequest(transaction)
    ? (transaction?.maxFeePerGas ?? 0n) * (gasLimit ?? 0n) + additionalL1Gas
    : (("gasPrice" in transaction && transaction?.gasPrice) || 0n) *
        (gasLimit ?? 0n) +
      additionalL1Gas

  // If the wallet doesn't have enough base asset to cover gas, push a warning
  if (gasFee + (transaction.value ?? 0n) > baseAssetBalance) {
    txAnnotation.warnings ??= []
    txAnnotation.warnings.push("insufficient-funds")
  }

  // If the transaction has been mined, get the block and set the timestamp
  if (blockHash) {
    block = await chainService.getBlockData(network, blockHash)
    txAnnotation = {
      ...txAnnotation,
      blockTimestamp: block?.timestamp,
    }
  }

  // If the tx is missing a recipient, its a contract deployment.
  if (typeof transaction.to === "undefined") {
    txAnnotation = {
      ...txAnnotation,
      type: "contract-deployment",
    }
  } else if (
    transaction.input === null ||
    transaction.input === "0x" ||
    typeof transaction.input === "undefined"
  ) {
    // If the tx has no data, it's either a simple ETH send, or it's relying
    // on a contract that's `payable` to execute code

    const [recipient, sender] = await Promise.all([
      enrichAddressOnNetwork(chainService, nameService, {
        address: transaction.to,
        network,
      }),
      enrichAddressOnNetwork(chainService, nameService, {
        address: transaction.from,
        network,
      }),
    ])

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
      if (recipient.annotation.hasCode) {
        txAnnotation.warnings ??= []
        txAnnotation.warnings.push("send-to-contract")
      }

      txAnnotation = {
        ...txAnnotation,
        type: "asset-transfer",
        sender,
        recipient,
        assetAmount: enrichAssetAmountWithDecimalValues(
          {
            asset: network.baseAsset,
            amount: transaction.value,
          },
          desiredDecimals
        ),
      }
    }
  } else {
    const assets = await indexingService.getCachedAssets(network)

    // See if the address matches a fungible asset.
    const matchingFungibleAsset = assets.find(
      (asset): asset is SmartContractFungibleAsset =>
        isSmartContractFungibleAsset(asset) &&
        sameEVMAddress(asset.contractAddress, transaction.to)
    )

    const transactionLogoURL = matchingFungibleAsset?.metadata?.logoURL

    const erc20Tx = parseERC20Tx(transaction.input)

    // TODO handle the case where we don't have asset metadata already
    if (
      matchingFungibleAsset &&
      erc20Tx &&
      (erc20Tx.name === "transfer" || erc20Tx.name === "transferFrom")
    ) {
      const [sender, recipient] = await Promise.all([
        enrichAddressOnNetwork(chainService, nameService, {
          address: erc20Tx.args.from ?? transaction.from,
          network,
        }),
        enrichAddressOnNetwork(chainService, nameService, {
          address: erc20Tx.args.to,
          network,
        }),
      ])

      // We have an ERC-20 transfer
      txAnnotation = {
        ...txAnnotation,
        type: "asset-transfer",
        transactionLogoURL,
        sender,
        recipient,
        assetAmount: enrichAssetAmountWithDecimalValues(
          {
            asset: matchingFungibleAsset,
            amount: BigInt(erc20Tx.args.amount),
          },
          desiredDecimals
        ),
      }
      // Warn if we're sending the token to its own contract
      if (sameEVMAddress(erc20Tx.args.to, transaction.to)) {
        txAnnotation.warnings ??= []
        txAnnotation.warnings.push("send-to-token")
      }
      // Warn if we're sending the token to a contract. This is normal if
      // you're funding a multisig or exchange, but it's good to double check
      if (recipient.annotation.hasCode) {
        txAnnotation.warnings ??= []
        txAnnotation.warnings.push("send-to-contract")
      }
    } else if (matchingFungibleAsset && erc20Tx && erc20Tx.name === "approve") {
      const spender = await enrichAddressOnNetwork(chainService, nameService, {
        address: erc20Tx.args.spender,
        network,
      })
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
            asset: matchingFungibleAsset,
            amount: BigInt(erc20Tx.args.value),
          },
          desiredDecimals
        ),
      }
    } else {
      // Fall back on a standard contract interaction.
      txAnnotation = {
        ...txAnnotation,
        // Include the logo URL if we resolve it even if the interaction is
        // non-specific; the UI can choose to use it or not, but if we know the
        // address has an associated logo it's worth passing on.
        transactionLogoURL,
        contractInfo: await enrichAddressOnNetwork(chainService, nameService, {
          address: transaction.to,
          network,
        }),
      }
      // Look up the function selector in case its a known ABI.
      const fourByteSig = await lookupFunctionSelector(transaction.input)
      if (fourByteSig) {
        const functionSignature = {
          abi: fourByteSig.functionSignature,
          selector: fourByteSig.functionSelector,
        }
        txAnnotation = {
          ...txAnnotation,
          functionSignature,
        }
      }
    }
  }

  // Look up logs and resolve subannotations, if available.
  if ("logs" in transaction && typeof transaction.logs !== "undefined") {
    const subannotations = await annotationsFromLogs(
      chainService,
      indexingService,
      nameService,
      transaction.logs,
      network,
      desiredDecimals,
      txAnnotation.timestamp,
      block
    )

    if (subannotations.length > 0) {
      txAnnotation.subannotations = subannotations
    }
  }

  return txAnnotation
}
