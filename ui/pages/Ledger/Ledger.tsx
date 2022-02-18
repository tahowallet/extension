import { connectLedger } from "@tallyho/tally-background/redux-slices/ledger"
import React, { ReactElement, useState } from "react"
import { ledgerUSBVendorId } from "@ledgerhq/devices"
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer"
import BrowserTabContainer from "../../components/BrowserTab/BrowserTabContainer"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import LedgerConnectPopup from "./LedgerConnectPopup"
import LedgerImportDone from "./LedgerImportDone"
import LedgerImportAccounts from "./LedgerImportAccounts"
import LedgerPrepare from "./LedgerPrepare"

export default function Ledger(): ReactElement {
  const [phase, setPhase] = useState<
    "0-prepare" | "1-request" | "2-connect" | "3-done" | "4-error"
  >("0-prepare")
  const deviceID = useBackgroundSelector(
    (state) => state.ledger.currentDeviceID
  )
  const [connecting, setConnecting] = useState(false)

  const devices = useBackgroundSelector((state) => state.ledger.devices)
  const device = deviceID === null ? null : devices[deviceID] ?? null

  const dispatch = useBackgroundDispatch()

  let rejected = false

  return (
    <BrowserTabContainer>
      {(phase === "0-prepare" || phase === "4-error") && (
        <LedgerPrepare
          showWarning={phase === "4-error"}
          onContinue={async () => {
            setPhase("1-request")
            try {
              // Open popup for testing
              // TODO: use result (for multiple devices)?
              await navigator.usb.requestDevice({
                filters: [{ vendorId: ledgerUSBVendorId }],
              })
            } catch {
              // Timeout is needed to respond to clicks to,
              // e.g., "I don't see my device".
              // Without a timeout, the DOM is updated
              // before firing clicks outside the popup.
              await new Promise((resolve) => setTimeout(resolve, 100))

              rejected = true
            }

            if (rejected) {
              setPhase("4-error")
            } else {
              setPhase("2-connect")

              setConnecting(true)
              try {
                await dispatch(connectLedger())
              } finally {
                setConnecting(false)
              }
            }
          }}
        />
      )}
      {phase === "1-request" && <LedgerConnectPopup />}
      {phase === "2-connect" && !device && connecting && (
        <LedgerPanelContainer
          indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg"
          heading="Connecting..."
        />
      )}
      {phase === "2-connect" && device && (
        <LedgerImportAccounts
          device={device}
          onConnect={() => {
            setPhase("3-done")
          }}
        />
      )}
      {phase === "3-done" && (
        <LedgerImportDone
          onClose={() => {
            window.close()
          }}
        />
      )}
    </BrowserTabContainer>
  )
}
