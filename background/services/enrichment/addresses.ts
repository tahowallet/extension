import { AddressOnNetwork } from "../../accounts"

import ChainService from "../chain"
import NameService from "../name"

import { AddressOnNetworkAnnotation } from "./types"

// TODO look up whether contracts are verified on EtherScan
// TODO ABIs

export default async function resolveAddressAnnotation(
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
    ...addressOnNetwork,
    balance,
    nameOnNetwork,
    nonce: BigInt(nonce),
    code: codeHex !== "0x",
    timestamp: Date.now(),
  }
}
