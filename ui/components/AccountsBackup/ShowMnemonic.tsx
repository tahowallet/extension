import { lockKeyrings } from "@tallyho/tally-background/redux-slices/keyrings"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAreKeyringsUnlocked, useBackgroundDispatch } from "../../hooks"
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

type ShowMnemonicProps = { accounts: AccountTotal[] }

export default function ShowMnemonic({
  accounts,
}: ShowMnemonicProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showMnemonic",
  })

  const dispatch = useBackgroundDispatch()
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)

  useEffect(() => {
    const lockWallet = async () => dispatch(lockKeyrings())
    lockWallet()
  }, [dispatch])

  return (
    <>
      <SharedSlideUpMenuPanel header={t("header")} icon="icons/s/lock.svg">
        <div className="container simple_text">
          <div className="content">
            {areKeyringsUnlocked ? (
              <>
                <SharedWarningMessage text={t("warningMessage")} />
                <div className="exporting_container">
                  <SharedAccordion
                    headerElement={<div>Wallet</div>}
                    contentElement={
                      <>
                        {accounts.map((accountTotal) => (
                          <SharedAccountItemSummary
                            accountTotal={accountTotal}
                          />
                        ))}
                      </>
                    }
                  />
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
        .content {
        }
        .exporting_container {
        }
      `}</style>
    </>
  )
}
