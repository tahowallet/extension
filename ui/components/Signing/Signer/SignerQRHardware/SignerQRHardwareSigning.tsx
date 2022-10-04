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
      <>
        <div className="container">
          <div className="title">Scan signature</div>
          <div className="content">
            <AnimatedQRScanner
              purpose={Purpose.SIGN}
              handleScan={handleScan}
              handleError={handleError}
              options={{
                width: 300,
              }}
            />
          </div>
        </div>
        <style jsx>
          {`
            .container {
              margin-top: -24px; // Revert slide-up padding-top (FIXME?)
            }
            .title {
              margin: 1rem 2rem;
              font-weight: 500;
              font-size: 22px;
              line-height: 32px;
              color: var(--trophy-gold);
            }
            .content {
              display: flex;
              justify-content: center;
              margin: 1rem;
              padding: 1rem;
              border-radius: 1rem;
              background-color: var(--hunter-green);
            }
            .message {
              margin: 0.5rem;
              font-size: 16px;
              line-height: 24px;
              color: var(--green-60);
            }
            .footer_actions {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 1rem;
              box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
            }
          `}
        </style>
      </>
    )
  }

  if (signingInitiated && qrSigningRequest) {
    return (
      <>
        <div className="container">
          <div className="title">Scan and sign</div>
          <div className="content">
            <AnimatedQRCode
              cbor={qrSigningRequest.ur.cbor}
              type={qrSigningRequest.ur.type}
            />
          </div>
          <div className="footer_actions">
            <SharedButton type="primary" size="large" onClick={handleSignature}>
              Get signature
            </SharedButton>
          </div>
        </div>
        <style jsx>
          {`
            .container {
              margin-top: -24px; // Revert slide-up padding-top (FIXME?)
            }
            .title {
              margin: 1rem 2rem;
              font-weight: 500;
              font-size: 22px;
              line-height: 32px;
              color: var(--trophy-gold);
            }
            .content {
              display: flex;
              justify-content: center;
              margin: 1rem;
              padding: 1rem;
              border-radius: 1rem;
              background-color: var(--hunter-green);
            }
            .message {
              margin: 0.5rem;
              font-size: 16px;
              line-height: 24px;
              color: var(--green-60);
            }
            .footer_actions {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 1rem;
              box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
            }
          `}
        </style>
      </>
    )
  }

  return <></>
}
