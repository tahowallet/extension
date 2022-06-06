import { React } from "react"
import {
  SigningRequest,
  SignOperation,
} from "@tallyho/tally-background/redux-slices/signing"
import { SignDataRequest } from "../../../../../background/utils/signing"

// eslint-disable-next-line import/prefer-default-export
export function resolveTransactionSignatureDetails(request: {
  signingOperation: SignOperation<SignDataRequest>
}) /*: ResolvedSignatureDetails */ {
  return {
    signer: request.signingOperation.accountSigner,
    network: request.signingOperation.request.account.network,
		renderedSigningData: <></>,
	}
}

