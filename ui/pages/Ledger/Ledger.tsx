import React, { ReactElement, useState } from "react"
import LedgerPrepareScreen from "../../components/Ledger/LedgerPrepareScreen"
import LedgerConnectPopupScreen from "../../components/Ledger/LedgerConnectPopupScreen"
import LedgerImportSelectAccountsScreen from "../../components/Ledger/LedgerImportSelectAccountsScreen"
import LedgerImportDoneScreen from "../../components/Ledger/LedgerImportDoneScreen"
import TabContainer from "../../components/Tab/TabContainer"

export default function Ledger(): ReactElement {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [done, setDone] = useState(false)

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
