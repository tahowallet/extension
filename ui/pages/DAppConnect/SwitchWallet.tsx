import { selectDefaultWallet } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../components/Shared/SharedButton"
import SharedTooltip from "../../components/Shared/SharedTooltip"
import { useBackgroundSelector } from "../../hooks"

export default function SwitchWallet({
  switchWallet,
}: {
  switchWallet: () => void
}): ReactElement | null {
  const { t } = useTranslation("translation", {
    keyPrefix: "switchWallet",
  })
  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)

  if (!isDefaultWallet) return null

  return (
    <div className="switch_wallet">
      <div className="switch_wallet_row">
        <span>🦊 {t("title")}</span>
        <SharedTooltip width={200} horizontalPosition="left">
          {t("tooltip")}
        </SharedTooltip>
      </div>
      <div className="switch_wallet_button">
        <SharedButton size="medium" type="tertiary" onClick={switchWallet}>
          {t("confirmSwitchWallet")}
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
