import { SigningRequest } from "@tallyho/tally-background/redux-slices/signing"
import { EIP1559TransactionRequest } from "../../../../background/networks"

export function resolveTransactionSignatureDetails(request: SigningRequest & { transactionRequest: EIP1559TransactionRequest })/*: ResolvedSignatureDetails */{
	return {
		network: request.transactionRequest.network,
  /*signer: AccountSigner
  network: EVMNetwork
  renderedSigningData: ReactElement
  signActionCreator: ActionCreatorWithoutPayload
  rejectActionCreator: ActionCreatorWithoutPayload*/
	}
}
