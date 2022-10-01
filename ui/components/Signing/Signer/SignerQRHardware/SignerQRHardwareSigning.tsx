import { selectQRSigningRequest } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { AnyAction } from "redux"
import {
  AnimatedQRScanner,
  AnimatedQRCode,
  Purpose,
} from "@keystonehq/animated-qr"
import { resolveQRSignature } from "@tallyho/tally-background/redux-slices/qr-hardware"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import SharedButton from "../../../Shared/SharedButton"

type SignerKeyringSigningProps = {
  signActionCreator: () => AnyAction
}

export default function SignerQRHardwareSigning({
  signActionCreator,
}: SignerKeyringSigningProps): ReactElement {
  const dispatch = useBackgroundDispatch()
  const qrSigningRequest = useBackgroundSelector(selectQRSigningRequest)
  const [signingInitiated, setSigningInitiated] = useState(false)
  const [scanningSignature, setScanningSignature] = useState(false)

  useEffect(() => {
    if (!signingInitiated) {
      dispatch(signActionCreator())

      setSigningInitiated(true)
    }
  }, [
    qrSigningRequest,
    signingInitiated,
    setSigningInitiated,
    dispatch,
    signActionCreator,
  ])

  const handleSignature = useCallback(() => {
    setScanningSignature(true)
  }, [setScanningSignature])

  const handleScan = useCallback(
    ({ type, cbor }) => {
      console.log("onScanSuccess", cbor, type)
      if (!qrSigningRequest) {
        return
      }
      dispatch(
        resolveQRSignature({ id: qrSigningRequest.id, ur: { type, cbor } })
      )
    },
    [dispatch, qrSigningRequest]
  )

  const handleError = useCallback((error: string) => {
    console.log("onScanError", error)
  }, [])

  if (scanningSignature) {
    return (
      <AnimatedQRScanner
        purpose={Purpose.SIGN}
        handleScan={handleScan}
        handleError={handleError}
        options={{
          width: 300,
        }}
      />
    )
  }

  if (signingInitiated && qrSigningRequest) {
    return (
      <>
        <AnimatedQRCode
          cbor={qrSigningRequest.ur.cbor}
          type={qrSigningRequest.ur.type}
        />
        <footer>
          <SharedButton type="primary" size="large" onClick={handleSignature}>
            scan signature
          </SharedButton>
        </footer>
      </>
    )
  }

  return <></>
}
