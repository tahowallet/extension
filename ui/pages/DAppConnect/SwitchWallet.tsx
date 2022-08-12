import { selectDefaultWallet } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"
import SharedTooltip from "../../components/Shared/SharedTooltip"
import { useBackgroundSelector } from "../../hooks"

export default function SwitchWallet({
  switchWallet,
}: {
  switchWallet: () => void
}): ReactElement {
  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)

  if (!isDefaultWallet) return <></>

  return (
    <div className="switch_wallet">
      <div className="switch_wallet_row">
        <span>🦊 Want to use another wallet instead?</span>
        <SharedTooltip width={200} horizontalPosition="left">
          You are seeing this because TallyHo! is set as default wallet, you can
          change this option in the main menu.
        </SharedTooltip>
      </div>
      <div className="switch_wallet_button">
        <SharedButton size="medium" type="tertiary" onClick={switchWallet}>
          Yes, switch wallet
        </SharedButton>
      </div>
      <style jsx>{`
        .switch_wallet {
          background: var(--green-120);
          padding: 8px 15px 0 8px;
          border-radius: 8px;
        }
        .switch_wallet_row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-20);
        }
        .switch_wallet_button {
          margin-left: 24px;
        }
      `}</style>
    </div>
  )
}
