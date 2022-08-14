import { AddressOnNetwork } from "../../accounts"

import ChainService from "../chain"
import NameService from "../name"

import { AddressOnNetworkAnnotation, EnrichedAddressOnNetwork } from "./types"

// TODO look up whether contracts are verified on EtherScan
// TODO ABIs

export async function resolveAddressAnnotation(
  chainService: ChainService,
  nameService: NameService,
  addressOnNetwork: AddressOnNetwork
): Promise<AddressOnNetworkAnnotation> {
  const { address, network } = addressOnNetwork
  const provider = chainService.providerForNetworkOrThrow(network)
  const [nonce, codeHex, balance, nameOnNetwork] = await Promise.all([
    provider.getTransactionCount(address),
    provider.getCode(address),
    chainService.getLatestBaseAccountBalance(addressOnNetwork),
    nameService.lookUpName(addressOnNetwork),
  ])
  return {
    balance,
    nameOnNetwork,
    nonce: BigInt(nonce),
    hasCode: codeHex !== "0x",
    timestamp: Date.now(),
  }
}

export async function enrichAddressOnNetwork(
  chainService: ChainService,
  nameService: NameService,
  addressOnNetwork: AddressOnNetwork
): Promise<EnrichedAddressOnNetwork> {
  return {
    ...addressOnNetwork,
    annotation: await resolveAddressAnnotation(
      chainService,
      nameService,
      addressOnNetwork
    ),
  }
}
