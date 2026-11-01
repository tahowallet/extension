import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedAddress from "../Shared/SharedAddress"

export default function TopMenuProfileTooltip(props: {
  address: string
}): ReactElement {
  const { t } = useTranslation()
  const { address } = props

  return (
    <div className="tooltip">
      <SharedAddress
        address={address}
        name={t("topMenu.copyAddressTooltip")}
        showCopyIcon
      />
      <style jsx>{`
        .tooltip {
          display: flex;
          align-items: center;
          position: absolute;
          z-index: 999999999;
          cursor: pointer;
          bottom: -30px;
          right: 0;
          background-color: var(--tooltip-quiet-background);
          box-shadow: var(--tooltip-quiet-shadow);
          padding: 8px 10px 8px;
          border-radius: 8px;
          color: var(--tooltip-action);
          --address-hover: var(--tooltip-action-hover);
          --address-icon-hover: var(--tooltip-action-icon-hover);
        }
      `}</style>
    </div>
  )
}
