import { selectTypedData } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement } from "react"
import Signing from "../components/Signing"
import { useBackgroundSelector } from "../hooks"

export default function SignData(): ReactElement {
  const typedDataRequest = useBackgroundSelector(selectTypedData)

  return <Signing request={typedDataRequest} />
}
