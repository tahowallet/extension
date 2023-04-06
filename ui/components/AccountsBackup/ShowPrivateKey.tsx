import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { lockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedWarningMessage from "../Shared/SharedWarningMessage"
import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import { useAreKeyringsUnlocked, useBackgroundDispatch } from "../../hooks"
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
  const dispatch = useBackgroundDispatch()
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)

  useEffect(() => {
    const lockWallet = async () => dispatch(lockKeyrings())
    lockWallet()
  }, [dispatch])

  return (
    <>
      <SharedSlideUpMenuPanel header={t("header")} icon="icons/s/key.svg">
        <div className="container simple_text">
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
            height: 91%;
            padding: 0 24px 24px;
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
            border-bottom: 1px solid #183736;
            padding: 8px 0 24px;
          }
          .exporting_container {
            box-sizing: border-box;
            width: 100%;
            height: 342px;
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
