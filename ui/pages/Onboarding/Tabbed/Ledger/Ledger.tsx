import { connectLedger } from "@tallyho/tally-background/redux-slices/ledger"
import React, { ReactElement, useState } from "react"
import { ledgerUSBVendorId } from "@ledgerhq/devices"
import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import LedgerPanelContainer from "../../../../components/Ledger/LedgerPanelContainer"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import LedgerImportAccounts from "./LedgerImportAccounts"
import LedgerPrepare from "./LedgerPrepare"
import OnboardingRoutes from "../Routes"
import type { NetworkFamily } from "@tallyho/tally-background/networks"
import OnboardingAccountFamilyTabs from "../../../../components/Onboarding/OnboardingAccountFamilyTabs"
import OnboardingBitcoinNeedsRecoveryPhrase from "../../../../components/Onboarding/OnboardingBitcoinNeedsRecoveryPhrase"

const filters: USBDeviceFilter[] = [{ vendorId: ledgerUSBVendorId }]

export default function Ledger(): ReactElement {
  const [phase, setPhase] = useState<"1-prepare" | "2-connect">("1-prepare")

  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding",
  })

  const deviceID = useBackgroundSelector(
    (state) => state.ledger.currentDeviceID,
  )
  const [connecting, setConnecting] = useState(false)
  const [accountFamily, setAccountFamily] = useState<NetworkFamily>("EVM")

  const devices = useBackgroundSelector((state) => state.ledger.devices)
  const device = deviceID === null ? null : (devices[deviceID] ?? null)

  const usbDeviceCount = useBackgroundSelector(
    (state) => state.ledger.usbDeviceCount,
  )

  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  const connectionError = phase === "2-connect" && !device && !connecting
  return (
    <div>
      <style jsx>{`
        div {
          position: relative;
        }
        .family_tabs {
          width: 356px;
          margin: 0 auto;
        }
      `}</style>
      {phase === "1-prepare" && (
        <div className="family_tabs">
          <OnboardingAccountFamilyTabs
            family={accountFamily}
            onChange={setAccountFamily}
          />
        </div>
      )}
      {accountFamily === "spark" && <OnboardingBitcoinNeedsRecoveryPhrase />}
      {accountFamily === "EVM" &&
        (phase === "1-prepare" || connectionError) && (
          <LedgerPrepare
            initialScreen={phase === "1-prepare"}
            deviceCount={usbDeviceCount}
            onContinue={async () => {
              try {
                // Open popup for testing
                // TODO: use result (for multiple devices)?
                await navigator.usb.requestDevice({
                  filters,
                })
              } catch {
                // Timeout is needed to respond to clicks to,
                // e.g., "I don't see my device".
                // Without a timeout, the DOM is updated
                // before firing clicks outside the popup.
                await new Promise((resolve) => {
                  setTimeout(resolve, 100)
                })

                // We don't handle the error here but let
                // connectLedger fail later.
              }

              setPhase("2-connect")

              setConnecting(true)
              try {
                await dispatch(connectLedger())
              } finally {
                setConnecting(false)
              }
            }}
          />
        )}
      {phase === "2-connect" && !device && connecting && (
        <LedgerPanelContainer
          indicatorImage="unknown"
          heading={t("connecting")}
        />
      )}
      {phase === "2-connect" && device && (
        <LedgerImportAccounts
          device={device}
          onConnect={() => {
            dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
            history.push(OnboardingRoutes.ONBOARDING_COMPLETE)
          }}
        />
      )}
    </div>
  )
}
