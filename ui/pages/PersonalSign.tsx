import React, { ReactElement } from "react"
import { selectSigningData } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../hooks"
import Signing from "../components/Signing"
import CorePage from "../components/Core/CorePage"

export default function PersonalSignData(): ReactElement {
  const signingDataRequest = useBackgroundSelector(selectSigningData)

  return (
    <CorePage>
      <Signing request={signingDataRequest} />
    </CorePage>
  )
}
