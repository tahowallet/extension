import { Deferrable } from "@ethersproject/properties"
import {
  JsonRpcSigner,
  TransactionRequest as EthersTransactionRequest,
  TransactionResponse,
  Web3Provider,
} from "@ethersproject/providers"
import { AccessList } from "@ethersproject/transactions"
import { encodeJSON } from "./lib/utils"
import { toHexChainID, EVMNetwork } from "./networks"
import { TransactionAnnotation } from "./services/enrichment"

interface TallyInternalJsonRpcSigner extends JsonRpcSigner {
  sendTransaction(
    transaction: Deferrable<
      EthersTransactionRequest & { annotation?: TransactionAnnotation }
    >
  ): Promise<TransactionResponse>
}

// Not sure the best place to put this in but it feels like it deserves its own file.
export default class TallyWeb3Provider extends Web3Provider {
  switchChain(network: EVMNetwork): Promise<unknown> {
    return this.send("wallet_switchEthereumChain", [
      {
        chainId: toHexChainID(network.chainID),
      },
    ])
  }

  override getSigner(
    addressOrIndex?: string | number
  ): TallyInternalJsonRpcSigner {
    return super.getSigner(addressOrIndex)
  }

  static override hexlifyTransaction(
    transaction: EthersTransactionRequest & {
      annotation?: TransactionAnnotation
    },
    allowExtra?: { [key: string]: boolean }
  ): { [key: string]: string | AccessList } {
    const { annotation, ...transactionRequest } = transaction
    return {
      ...Web3Provider.hexlifyTransaction(transactionRequest, allowExtra),
      annotation: encodeJSON(annotation),
    }
  }
}
