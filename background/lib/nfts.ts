import { AddressOnNetwork } from "../accounts"
import { getNFTs as alchemyGetNFTs, AlchemyNFTItem } from "./alchemy"

export type NFT = AlchemyNFTItem

export async function getNFTs({
  address,
  network,
}: AddressOnNetwork): Promise<NFT[]> {
  if (["Polygon", "Ethereum"].includes(network.name)) {
    return alchemyGetNFTs({ address, network })
  }
  return []
}
