import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedWarningMessage from "../Shared/SharedWarningMessage"
import SharedButton from "../Shared/SharedButton"

export default function ShowPrivateKey(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showPrivateKey",
  })
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  return (
    <>
      <SharedSlideUpMenuPanel header={t("header")} icon="icons/s/key.svg">
        <div className="content simple_text">
          <SharedWarningMessage text={t("warningMessage")} />
          <div className="exporting_content">
            <span className="header">{t("exportingPrivateKey.header")}</span>
            {showPrivateKey ? (
              // TODO add a new component
              <div>Copy Private key to clipboard</div>
            ) : (
              <>
                <span className="confirmation">
                  {t("exportingPrivateKey.confirmationDesc")}
                </span>
                <SharedButton
                  type="primary"
                  size="medium"
                  onClick={() => setShowPrivateKey(true)}
                >
                  {t("exportingPrivateKey.showBtn")}
                </SharedButton>
              </>
            )}
          </div>
          <div>{t("privateKeyInfo")}</div>
        </div>
      </SharedSlideUpMenuPanel>
      <style jsx>
        {`
          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            padding: 0 24px;
          }
          .exporting_content {
            box-sizing: border-box;
            width: 100%;
            padding: 16px 24px;
            background: var(--green-120);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </>
  )
}
