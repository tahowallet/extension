import React, { ReactElement } from "react"
import { selectSigningData } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../hooks"
import Signing from "../components/Signing"

export default function PersonalSignData(): ReactElement {
  const signingDataRequest = useBackgroundSelector(selectSigningData)

  return <Signing request={signingDataRequest} />
}
