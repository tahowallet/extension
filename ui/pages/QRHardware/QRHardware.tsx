import { connectLedger } from "@tallyho/tally-background/redux-slices/ledger"
import { AnimatedQRScanner, Purpose } from "@keystonehq/animated-qr"
import React, { ReactElement, useCallback, useState } from "react"
import {
  resetState,
  syncQRKeyring,
} from "@tallyho/tally-background/redux-slices/qr-hardware"
import BrowserTabContainer from "../../components/BrowserTab/BrowserTabContainer"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import QRHardwareImportDone from "./QRHardwareImportDone"
import QRHardwareImportAccounts from "./QRHardwareImportAccounts"
import LedgerPrepare from "./QRHardwarePrepare"

export default function QRHardware(): ReactElement {
  const [phase, setPhase] = useState<
    "0-prepare" | "1-request" | "2-connect" | "3-done"
  >("0-prepare")
  const deviceID = useBackgroundSelector(
    (state) => state.qrHardware.currentDeviceID
  )
  const [connecting, setConnecting] = useState(false)

  const devices = useBackgroundSelector((state) => state.qrHardware.devices)
  const device = deviceID === null ? null : devices[deviceID] ?? null

  const dispatch = useBackgroundDispatch()
  const connectionError = phase === "2-connect" && !device && !connecting

  const handleScan = useCallback(
    ({ type, cbor }) => {
      console.log("onScanSuccess", cbor, type)
      dispatch(syncQRKeyring({ type, cbor }))
    },
    [dispatch]
  )

  const handleError = useCallback((error: string) => {
    console.log("onScanError", error)
  }, [])

  return (
    <BrowserTabContainer>
      {(phase === "0-prepare" || connectionError) && (
        <LedgerPrepare
          initialScreen={phase === "0-prepare"}
          onContinue={async () => {
            setPhase("1-request")
            // try {
            //   // Open popup for testing
            //   // TODO: use result (for multiple devices)?
            //   await navigator.usb.requestDevice({
            //     filters,
            //   })
            // } catch {
            //   // Timeout is needed to respond to clicks to,
            //   // e.g., "I don't see my device".
            //   // Without a timeout, the DOM is updated
            //   // before firing clicks outside the popup.
            //   await new Promise((resolve) => setTimeout(resolve, 100))

            //   // We don't handle the error here but let
            //   // connectLedger fail later.
            // }

            if (device) {
              dispatch(resetState())
              setPhase("2-connect")
            }

            setConnecting(true)
            try {
              await dispatch(connectLedger())
            } finally {
              setConnecting(false)
            }
          }}
        />
      )}
      {phase === "1-request" && (
        <AnimatedQRScanner
          purpose={Purpose.SYNC}
          handleScan={handleScan}
          handleError={handleError}
          options={{
            width: 300,
          }}
        />
      )}
      {phase === "2-connect" && device && (
        <QRHardwareImportAccounts
          device={device}
          onConnect={() => {
            setPhase("3-done")
          }}
        />
      )}
      {phase === "3-done" && (
        <QRHardwareImportDone
          onClose={() => {
            window.close()
          }}
        />
      )}
    </BrowserTabContainer>
  )
}
