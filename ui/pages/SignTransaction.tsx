import React, { ReactElement } from "react"
import { selectPendingTransactionRequest } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { useBackgroundSelector } from "../hooks"
import Signing from "../components/Signing"
import CorePage from "../components/Core/CorePage"

export default function SignTransaction(): ReactElement {
  const transactionDetails = useBackgroundSelector(
    selectPendingTransactionRequest,
  )

  return (
    <CorePage>
      <Signing request={transactionDetails} />
    </CorePage>
  )
}
