import { selectInternalSignerStatus } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useEffect, useState } from "react"
import { AnyAction } from "redux"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import InternalSignerSetPassword from "../../../InternalSigner/InternalSignerSetPassword"
import InternalSignerUnlock from "../../../InternalSigner/InternalSignerUnlock"

type SignerInternalSigningProps = {
  signActionCreator: () => AnyAction
  redirectToActivityPage?: boolean
}

export default function SignerInternalSigning({
  signActionCreator,
  redirectToActivityPage,
}: SignerInternalSigningProps): ReactElement | null {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  const lockStatus = useBackgroundSelector(selectInternalSignerStatus)
  const [signingInitiated, setSigningInitiated] = useState(false)

  // Initiate signing once internal signer service is ready.
  useEffect(() => {
    if (!signingInitiated && lockStatus === "unlocked") {
      dispatch(signActionCreator()).finally(() => {
        // Redirect to activity page after submitting
        if (redirectToActivityPage) {
          history.push("/", { goTo: "activity-page" })
        }
      })

      setSigningInitiated(true)
    }
  }, [
    lockStatus,
    signingInitiated,
    setSigningInitiated,
    dispatch,
    signActionCreator,
    history,
    redirectToActivityPage,
  ])

  // In this construction, internal signer service unlocking isn't done as a route, but in line
  // in the signing frame.
  if (lockStatus === "uninitialized") {
    return <InternalSignerSetPassword />
  }
  if (lockStatus === "locked") {
    return <InternalSignerUnlock displayCancelButton={false} />
  }

  // If the internal signer service is ready, we don't render anything as signing should be
  // quick; we may want a brief spinner.
  return null
}
