import { AnimatedQRScanner, Purpose } from "@keystonehq/animated-qr"
import React, { ReactElement, useCallback, useState } from "react"
import {
  resetState,
  syncQRKeyring,
} from "@tallyho/tally-background/redux-slices/qr-hardware"
import BrowserTabContainer from "../../components/BrowserTab/BrowserTabContainer"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import QRHardwareImportAccounts from "./QRHardwareImportAccounts"
import QRHardwarePanelContainer from "./QRHardwarePanelContainer"
import QRHardwareImportDone from "./QRHardwareImportDone"

export default function QRHardware(): ReactElement {
  const [phase, setPhase] = useState<"0-scan" | "1-import" | "2-done">("0-scan")

  const deviceID = useBackgroundSelector(
    (state) => state.qrHardware.currentDeviceID
  )
  const devices = useBackgroundSelector((state) => state.qrHardware.devices)
  const device = deviceID === null ? null : devices[deviceID] ?? null

  const dispatch = useBackgroundDispatch()

  if (device && phase === "0-scan") {
    setPhase("1-import")
    dispatch(resetState(false))
  }

  if (!device && phase !== "0-scan") {
    setPhase("0-scan")
  }

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
      {phase === "0-scan" && (
        <QRHardwarePanelContainer
          heading="Sync accounts"
          subHeading="Scan the QR code of an airgapped HD wallet"
        >
          <AnimatedQRScanner
            purpose={Purpose.SYNC}
            handleScan={handleScan}
            handleError={handleError}
            options={{
              width: 300,
            }}
          />
        </QRHardwarePanelContainer>
      )}
      {phase === "1-import" && device && (
        <QRHardwareImportAccounts
          device={device}
          onConnect={() => {
            setPhase("2-done")
          }}
          onReset={() => {
            dispatch(resetState(true))
          }}
        />
      )}
      {phase === "2-done" && (
        <QRHardwareImportDone
          onClose={() => {
            window.close()
          }}
        />
      )}
    </BrowserTabContainer>
  )
}
