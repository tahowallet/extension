import {
  AnyAssetAmount,
  AnyAsset,
  SmartContractFungibleAsset,
  isSmartContractFungibleAsset,
} from "../../assets"
import { AnyEVMTransaction } from "../../networks"
import {
  AssetDecimalAmount,
  enrichAssetAmountWithDecimalValues,
} from "../../redux-slices/utils/asset-utils"
import { HexString } from "../../types"

/// //////////////////////////////////////////////////////////////////////// ///
//                         STUB for EnrichmentService                         //
/// //////////////////////////////////////////////////////////////////////// ///
// The EnrichmentService will allow for enriching various data types like     //
// transactions with data resolved from elsewhere in the system. A good       //
// example is enriching a transaction with details about the contract         //
// interaction within it. This allows a quick presentation of the transaction //
// while slower details like contract calls are resolved against potentially  //
// slow or absent data providers.                                             //
/// //////////////////////////////////////////////////////////////////////// ///

export type BaseContractInfo = {
  contractLogoURL?: string | undefined
}

export type ContractDeployment = BaseContractInfo & {
  type: "contract-deployment"
}

export type ContractInteraction = BaseContractInfo & {
  type: "contract-interaction"
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
  | AssetTransfer
  | AssetSwap
  | undefined
function resolveContractInfo(
  assets: AnyAsset[],
  contractAddress: HexString | undefined,
  contractInput: HexString,
  desiredDecimals: number
): ContractInfo | undefined {
  // A missing recipient means a contract deployment.
  if (typeof contractAddress === "undefined") {
    return {
      type: "contract-deployment",
    }
  }

  // See if the address matches a fungible asset.
  const matchingFungibleAsset = assets.find(
    (asset): asset is SmartContractFungibleAsset =>
      isSmartContractFungibleAsset(asset) &&
      asset.contractAddress.toLowerCase() === contractAddress.toLowerCase()
  )

  const contractLogoURL = matchingFungibleAsset?.metadata?.logoURL

  // Derive value from transaction transfer if not sending ETH
  // FIXME Move to ERC20 parsing using ethers.
  if (
    typeof matchingFungibleAsset !== "undefined" &&
    contractInput.length === 138 &&
    contractInput.startsWith("0xa9059cbb") // transfer selector
  ) {
    return {
      type: "asset-transfer",
      contractLogoURL,
      recipientAddress: `0x${contractInput.substr(34, 64)}`,
      assetAmount: enrichAssetAmountWithDecimalValues(
        {
          asset: matchingFungibleAsset,
          amount: BigInt(`0x${contractInput.substr(10 + 64, 64)}`),
        },
        desiredDecimals
      ),
    }
  }

  // Fall back on a standard contract interaction.
  return {
    type: "contract-interaction",
    // Include the logo URL if we resolve it even if the interaction is
    // non-specific; the UI can choose to use it or not, but if we know the
    // address has an associated logo it's worth passing on.
    contractLogoURL,
  }
}

export function enrichTransactionWithContractInfo(
  assets: AnyAsset[],
  transaction: AnyEVMTransaction,
  desiredDecimals: number
): AnyEVMTransaction & { contractInfo?: ContractInfo | undefined } {
  if (transaction.input === null || transaction.input === "0x") {
    // This is _almost certainly_ not a contract interaction, move on. Note that
    // a simple ETH send to a contract address can still effectively be a
    // contract interaction (because it calls the fallback function on the
    // contract), but for now we deliberately ignore that scenario when
    // categorizing activities.
    return transaction
  }

  return {
    ...transaction,
    contractInfo: resolveContractInfo(
      assets,
      transaction.to,
      transaction.input,
      desiredDecimals
    ),
  }
}
