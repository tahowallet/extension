import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAreKeyringsUnlocked, useLockWallet } from "../../hooks"
import KeyringUnlock from "../Keyring/KeyringUnlock"
import SharedAccordion from "../Shared/SharedAccordion"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedWarningMessage from "../Shared/SharedWarningMessage"
import ConfirmReveal from "./ConfirmReveal"
import Explainer from "./Explainer"
import RevealMnemonic from "./RevealMnemonic"

type ShowMnemonicProps = { accounts: AccountTotal[]; walletTitle: string }

export default function ShowMnemonic({
  accounts,
  walletTitle,
}: ShowMnemonicProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showMnemonic",
  })

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)

  useLockWallet()

  return (
    <>
      <SharedSlideUpMenuPanel
        header={t("header")}
        icon="icons/s/lock-bold.svg"
        type="small"
      >
        <div className="container simple_text">
          <div className="content">
            {areKeyringsUnlocked ? (
              <>
                <SharedWarningMessage text={t("warningMessage")} />
                <div>
                  <div className="exporting_header">
                    <SharedAccordion
                      style={{
                        "--background": "transparent",
                      }}
                      headerElement={
                        <div className="accounts_header">
                          <span className="accounts_title">{walletTitle}</span>
                          <span className="accounts_count">
                            {accounts.length}{" "}
                            {accounts.length < 2
                              ? t("exportingMnemonic.address")
                              : t("exportingMnemonic.addresses")}
                          </span>
                        </div>
                      }
                      contentElement={
                        <div className="account_list">
                          {accounts.map((accountTotal) => (
                            <div
                              className="account_item"
                              key={accountTotal.address}
                            >
                              <SharedAccountItemSummary
                                accountTotal={accountTotal}
                                style={{
                                  width: "100%",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      }
                    />
                  </div>
                  <div className="exporting_container">
                    {showMnemonic ? (
                      <RevealMnemonic address={accounts[0].address} />
                    ) : (
                      <ConfirmReveal
                        description={t("exportingMnemonic.confirmationDesc")}
                        invalidMessage={t("exportingMnemonic.invalidMessage")}
                        confirmButton={t("exportingMnemonic.showBtn")}
                        onConfirm={() => setShowMnemonic(true)}
                      />
                    )}
                  </div>
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
            {t("mnemonicInfo")}
          </SharedButton>
        </div>
      </SharedSlideUpMenuPanel>
      <SharedSlideUpMenu
        size="auto"
        isOpen={showExplainer}
        close={() => setShowExplainer(false)}
      >
        <Explainer
          translation="showMnemonic"
          close={() => setShowExplainer(false)}
        />
      </SharedSlideUpMenu>
      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 91%;
          gap: 16px;
          padding: 0 24px 24px;
          overflow: scroll;
        }
        .content {
          box-sizing: border-box;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .exporting_header {
          box-sizing: border-box;
          width: 100%;
          padding: 16px 24px;
          border-radius: 8px 8px 0 0;
          background: var(--hunter-green);
        }
        .exporting_container {
          box-sizing: border-box;
          width: 100%;
          padding: 16px 24px 24px;
          background: var(--green-120);
          border-radius: 0 0 8px 8px;
          display: flex;
          flex-direction: column;
        }
        .accounts_header {
          display: flex;
          justify-content: space-between;
          font-family: "Segment";
          line-height: 24px;
          font-style: normal;
        }
        .accounts_title {
          font-weight: 600;
          font-size: 18px;
          color: var(--green-5);
        }
        .accounts_count {
          font-weight: 400;
          font-size: 16px;
          color: var(--green-40);
        }
        .account_list {
          margin: 16px -16px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      `}</style>
    </>
  )
}
