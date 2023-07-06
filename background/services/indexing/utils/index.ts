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

export function allowVerifyUntrustedAssetByManualImport(
  asset: SmartContractFungibleAsset,
  verified?: boolean
): boolean {
  if (isUntrustedAsset(asset) && !isVerifiedAssetByUser(asset)) {
    return !!verified
  }

  return false
}
