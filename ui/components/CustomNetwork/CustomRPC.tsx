import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"

export default function CustomRPC(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.customNetworkSettings.customRPC",
  })

  return (
    <div className="custom_rpc_wrap">
      <span className="simple_text">{t(`description`)}</span>
      <SharedButton type="tertiary" size="medium" iconSmall="new-tab">
        {t(`addBtn`)}
      </SharedButton>
      <style jsx>{`
        .custom_rpc_wrap {
          padding-top: 28px;
          border-top: 1px solid var(--green-95);
          width: 100%;
        }
      `}</style>
    </div>
  )
}
