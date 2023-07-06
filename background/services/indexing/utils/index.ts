import { SmartContractFungibleAsset } from "../../../assets"
import { EVMNetwork } from "../../../networks"
import {
  isUntrustedAsset,
  isVerifiedAssetByUser,
} from "../../../redux-slices/utils/asset-utils"
import { HexString } from "../../../types"

export const getAssetsByAddress = (
  assets: SmartContractFungibleAsset[]
): {
  [address: string]: SmartContractFungibleAsset
} => {
  const activeAssetsByAddress = assets.reduce((agg, t) => {
    const newAgg = {
      ...agg,
    }
    newAgg[t.contractAddress.toLowerCase()] = t
    return newAgg
  }, {} as { [address: string]: SmartContractFungibleAsset })

  return activeAssetsByAddress
}

export const getActiveAssetsByAddressForNetwork = (
  network: EVMNetwork,
  activeAssetsToTrack: SmartContractFungibleAsset[]
): {
  [address: string]: SmartContractFungibleAsset
} => {
  const networkActiveAssets = activeAssetsToTrack.filter(
    (asset) => asset.homeNetwork.chainID === network.chainID
  )

  return getAssetsByAddress(networkActiveAssets)
}

export function shouldRefreshKnownAsset(
  asset: SmartContractFungibleAsset,
  metadata: {
    discoveryTxHash?: {
      [address: HexString]: HexString
    }
    verified?: boolean
  }
): boolean {
  // The asset that is in a token list or is a network base asset should not be refreshed.
  // They shouldn't have a discovery tx hash or any custom metadata.
  if (!isUntrustedAsset(asset)) return false

  const newDiscoveryTxHash = metadata?.discoveryTxHash
  const addressForDiscoveryTxHash = newDiscoveryTxHash
    ? Object.keys(newDiscoveryTxHash)[0]
    : undefined
  const existingDiscoveryTxHash = addressForDiscoveryTxHash
    ? asset.metadata?.discoveryTxHash?.[addressForDiscoveryTxHash]
    : undefined

  // If the discovery tx hash is not specified
  // or if it already exists in the asset, do not update the asset
  const allowAddDiscoveryTxHash = !(
    !newDiscoveryTxHash || existingDiscoveryTxHash
  )

  // Refresh a known unverified asset if it has been manually imported.
  // This check allows the user to add an asset from the unverified list.
  const isManuallyImported = metadata?.verified
  const allowVerifyAssetByManualImport =
    !isVerifiedAssetByUser(asset) && isManuallyImported

  return allowVerifyAssetByManualImport || allowAddDiscoveryTxHash
}
