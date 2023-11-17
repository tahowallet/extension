import React, { ReactElement } from "react"
import ActiveDAppConnection from "./ActiveDAppConnection"
import DAppConnectionDefaultToggle from "./DAppConnectionDefaultToggle"
import { useDappPermission } from "../../hooks/dapp-hooks"

export default function DAppConnection(): ReactElement {
  const { isConnected, currentPermission, allowedPages } = useDappPermission()

  return (
    <section>
      <ActiveDAppConnection
        isConnectedToDApp={isConnected}
        currentPermission={currentPermission}
        allowedPages={allowedPages}
      />

      <DAppConnectionDefaultToggle />
      <style jsx>{`
        section {
          background-color: var(--green-120);
          padding: 10px 16px 10px 4px;

          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </section>
  )
}
