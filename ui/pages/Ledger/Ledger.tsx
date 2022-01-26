import { ledgerReset } from "@tallyho/tally-background/redux-slices/ledger"
import React, { ReactElement, useEffect, useState } from "react"
import LedgerConnectPopupScreen from "../../components/Ledger/LedgerConnectPopupScreen"
import LedgerImportDoneScreen from "../../components/Ledger/LedgerImportDoneScreen"
import LedgerImportSelectAccountsScreen from "../../components/Ledger/LedgerImportSelectAccountsScreen"
import LedgerPrepareScreen from "../../components/Ledger/LedgerPrepareScreen"
import TabContainer from "../../components/Tab/TabContainer"
import { useBackgroundDispatch } from "../../hooks"

export default function Ledger(): ReactElement {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [done, setDone] = useState(false)

  const dispatch = useBackgroundDispatch()
  useEffect(() => {
    dispatch(ledgerReset())
  }, [dispatch])

  return (
    <TabContainer>
      {!done && !connected && !connecting && (
        <LedgerPrepareScreen
          onContinue={() => {
            setConnecting(true)
            navigator.usb.requestDevice({ filters: [] }).finally(() => {
              /* Allow some time to react to clicks before changing the UI. */
              setTimeout(() => {
                setConnecting(false)
                setConnected(true)
              }, 100)
            })
          }}
        />
      )}
      {!done && !connected && connecting && <LedgerConnectPopupScreen />}
      {!done && connected && (
        <LedgerImportSelectAccountsScreen
          onConnect={() => {
            setConnecting(false)
            setDone(true)
          }}
        />
      )}
      {done && (
        <LedgerImportDoneScreen
          onClose={() => {
            setConnecting(false)
            setConnected(false)
            setDone(false)
          }}
        />
      )}
    </TabContainer>
  )
}
