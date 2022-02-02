import {
  connectLedger,
  ledgerReset,
} from "@tallyho/tally-background/redux-slices/ledger"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import React, { ReactElement, useEffect, useState } from "react"
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
    "0-prepare" | "1-request" | "2-connect" | "3-done"
  >("0-prepare")
  const [deviceID, setDeviceID] = useState<string | null>(null)

  const devices = useBackgroundSelector((state) => state.ledger.devices)
  const device = deviceID === null ? null : devices[deviceID] ?? null

  const dispatch = useBackgroundDispatch()
  useEffect(() => {
    dispatch(ledgerReset())
  }, [dispatch])

  return (
    <BrowserTabContainer>
      {phase === "0-prepare" && (
        <LedgerPrepare
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

              // Advance anyway for testing. (TODO: do not.)
            }
            setPhase("2-connect")

            const { deviceID: newDeviceID } = (await dispatch(
              connectLedger()
            )) as unknown as AsyncThunkFulfillmentType<typeof connectLedger>

            setDeviceID(newDeviceID)
          }}
        />
      )}
      {phase === "1-request" && <LedgerConnectPopup />}
      {phase === "2-connect" && !device && (
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
            setPhase("0-prepare")
            setDeviceID(null)
            dispatch(ledgerReset())
          }}
        />
      )}
    </BrowserTabContainer>
  )
}
