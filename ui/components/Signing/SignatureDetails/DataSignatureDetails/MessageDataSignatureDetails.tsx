import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import {
  EIP4361Data,
  SignDataMessageType,
  SignDataRequest,
} from "@tallyho/tally-background/utils/signing"
import React, { ReactElement } from "react"
import EIP191Info from "../../../SignData/EIP191Info"
import EIP4361Info from "../../../SignData/EIP4361Info"
import DataSignatureDetails from "."

export type MessageDataSignatureDetailsProps = {
  messageRequest: SignDataRequest
}

export default function MessageDataSignatureDetails({
  messageRequest,
}: MessageDataSignatureDetailsProps): ReactElement {
  switch (messageRequest.messageType) {
    case SignDataMessageType.EIP4361:
      return (
        <DataSignatureDetails
          requestingSource={(messageRequest.signingData as EIP4361Data).domain}
          excludeTitle
        >
          <EIP4361Info
            signingData={messageRequest.signingData as EIP4361Data}
            excludeHeader
          />
        </DataSignatureDetails>
      )
    case SignDataMessageType.EIP191:
      return (
        <DataSignatureDetails>
          <EIP191Info
            account={messageRequest.account.address}
            internal={false}
            excludeHeader
            signingData={messageRequest.signingData}
          />
        </DataSignatureDetails>
      )
    default:
      return assertUnreachable(messageRequest.messageType)
  }
}
