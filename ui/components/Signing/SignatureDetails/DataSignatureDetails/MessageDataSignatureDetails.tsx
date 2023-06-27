import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import { MessageSigningRequest } from "@tallyho/tally-background/utils/signing"
import React, { ReactElement } from "react"
import EIP191Info from "../../../SignData/EIP191Info"
import EIP4361Info from "../../../SignData/EIP4361Info"
import DataSignatureDetails from "."

export type MessageDataSignatureDetailsProps = {
  messageRequest: MessageSigningRequest
}

export default function MessageDataSignatureDetails({
  messageRequest,
}: MessageDataSignatureDetailsProps): ReactElement {
  switch (messageRequest.messageType) {
    case "eip4361":
      return (
        <DataSignatureDetails
          requestingSource={messageRequest.signingData.domain}
          excludeTitle
        >
          <EIP4361Info signingData={messageRequest.signingData} />
        </DataSignatureDetails>
      )
    case "eip191":
      return (
        <DataSignatureDetails>
          <EIP191Info
            account={messageRequest.account.address}
            signingData={messageRequest.signingData}
          />
        </DataSignatureDetails>
      )
    default:
      return assertUnreachable(messageRequest)
  }
}
