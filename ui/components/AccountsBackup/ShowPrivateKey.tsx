import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedWarningMessage from "../Shared/SharedWarningMessage"
import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import { useAreKeyringsUnlocked, useLockWallet } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import KeyringUnlock from "../Keyring/KeyringUnlock"
import Explainer from "./Explainer"
import ConfirmReveal from "./ConfirmReveal"
import RevealPrivateKey from "./RevealPrivateKey"

type ShowPrivateKeyProps = { account: AccountTotal }

export default function ShowPrivateKey({
  account,
}: ShowPrivateKeyProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showPrivateKey",
  })
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)

  useLockWallet()

  return (
    <>
      <SharedSlideUpMenuPanel
        header={t("header")}
        icon="icons/s/key.svg"
        type="small"
      >
        <div className="container">
          <div className="content">
            {areKeyringsUnlocked ? (
              <>
                <SharedWarningMessage text={t("warningMessage")} />
                <div className="exporting_container">
                  <span className="header">
                    {t("exportingPrivateKey.header")}
                  </span>
                  <div className="account_container">
                    <SharedAccountItemSummary accountTotal={account} />
                  </div>
                  {showPrivateKey ? (
                    <RevealPrivateKey address={account.address} />
                  ) : (
                    <ConfirmReveal
                      description={t("exportingPrivateKey.confirmationDesc")}
                      invalidMessage={t("exportingPrivateKey.invalidMessage")}
                      confirmButton={t("exportingPrivateKey.showBtn")}
                      onConfirm={() => setShowPrivateKey(true)}
                    />
                  )}
                </div>
              </>
            ) : (
              <KeyringUnlock displayCancelButton={false} />
            )}
          </div>
          <SharedButton
            type="tertiaryGray"
            size="small"
            onClick={() => setShowExplainer(true)}
          >
            {t("privateKeyInfo")}
          </SharedButton>
        </div>
      </SharedSlideUpMenuPanel>
      <SharedSlideUpMenu
        size="auto"
        isOpen={showExplainer}
        close={() => setShowExplainer(false)}
      >
        <Explainer
          translation="showPrivateKey"
          close={() => setShowExplainer(false)}
        />
      </SharedSlideUpMenu>
      <style jsx>
        {`
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            height: calc(100% - 35px);
            box-sizing: border-box;
            padding: 0 24px 10px;
          }
          .content {
            box-sizing: border-box;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .account_container {
            display: flex;
            width: 100%;
            border-bottom: 1px solid var(--green-95);
            padding: 8px 0 24px;
            margin-bottom: 20px;
          }
          .exporting_container {
            box-sizing: border-box;
            width: 100%;
            padding: 16px 24px 24px;
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
