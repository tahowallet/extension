import { AddressOnNetwork } from "../accounts"
import { EVMNetwork } from "../networks"
import { NETWORK_BY_CHAIN_ID } from "../constants"
import { getNFTs as alchemyGetNFTs, AlchemyNFTItem } from "./alchemy"
import { getNFTs as simpleHashGetNFTs, SimpleHashNFTModel } from "./simple-hash"

export type NFT = {
  name: string
  description?: string
  tokenID: string
  network: EVMNetwork
  media: {
    type: "image" | "video" | "audio"
    url: string
  }[]
  contract: { address: string }
}

function alchemyNFTtoNFT(original: AlchemyNFTItem): NFT {
  const { contract, chainID } = original
  return {
    contract,
    name: original.title,
    tokenID: original.id.tokenId,
    media: original.media
      .filter((m) => m.gateway)
      .map((m) => ({
        url: m.gateway,
        type: "image" as const,
      })) as NFT["media"],
    network:
      NETWORK_BY_CHAIN_ID[
        chainID.toString() as keyof typeof NETWORK_BY_CHAIN_ID
      ],
  }
}

const SIMPLE_HASH_CHAIN_TO_ID = {
  ethereum: 1,
  optimism: 10,
  polygon: 137,
  arbitrum: 42161,
}

function simpleHashNFTModelToNFT(original: SimpleHashNFTModel): NFT {
  const {
    name,
    description,
    token_id: tokenID,
    contractAddress,
    chain,
  } = original
  const media = [
    {
      type: "image",
      url: original.image_url,
    },
    {
      type: "video",
      url: original.video_url,
    },
    {
      type: "audio",
      url: original.audio_url,
    },
  ].filter((m) => m.url)
  const chainID = SIMPLE_HASH_CHAIN_TO_ID[chain]
  return {
    name,
    description,
    contract: { address: contractAddress },
    tokenID,
    media: media as NFT["media"],
    network: NETWORK_BY_CHAIN_ID[chainID],
  }
}

export async function getNFTs({
  address,
  network,
}: AddressOnNetwork): Promise<NFT[]> {
  if (["Polygon", "Ethereum"].includes(network.name)) {
    return (await alchemyGetNFTs({ address, network })).map(alchemyNFTtoNFT)
  }
  if (["Arbitrum", "Optimism"].includes(network.name)) {
    return (await simpleHashGetNFTs({ address, network })).map(
      simpleHashNFTModelToNFT
    )
  }
  return []
}
