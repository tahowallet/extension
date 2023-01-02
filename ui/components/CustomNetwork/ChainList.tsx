import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"

const CHAIN_LIST_URL = "https://chainlist.org/"

export default function ChainList(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "settings" })

  return (
    <div className="chain_list_wrap">
      <div className="icon" />
      <span className="simple_text">
        {t(`customNetworkSettings.chainList.description`)}
      </span>
      <div>
        <SharedButton
          type="primary"
          size="medium"
          iconSmall="new-tab"
          style={{ marginTop: "24px" }}
          onClick={() => window.open(CHAIN_LIST_URL, "_blank")?.focus()}
        >
          {t(`customNetworkSettings.chainList.addBtn`)}
        </SharedButton>
      </div>
      <style jsx>{`
        .chain_list_wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .icon {
          background: url("./images/chain_list.svg") center no-repeat;
          width: 132px;
          height: 32px;
        }
      `}</style>
    </div>
  )
}
