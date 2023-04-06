import { exportMnemonic } from "@tallyho/tally-background/redux-slices/keyrings"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../hooks"
import SharedAccordion from "../Shared/SharedAccordion"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import SharedButton from "../Shared/SharedButton"
import SharedCheckbox from "../Shared/SharedCheckbox"
import SharedSecretText from "../Shared/SharedSecretText"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedWarningMessage from "../Shared/SharedWarningMessage"

type ShowMnemonicProps = { accounts: AccountTotal[] }

export default function ShowMnemonic({
  accounts,
}: ShowMnemonicProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showMnemonic",
  })
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })
  const dispatch = useBackgroundDispatch()

  const [mnemonic, setMnemonic] = useState("")
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showInvalidMessage, setShowInvalidMessage] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)

  useEffect(() => {
    const fetchMnemonic = async () => {
      const mnemonicText = (await dispatch(
        exportMnemonic(accounts[0].address)
      )) as unknown as string | null

      if (mnemonicText) {
        setMnemonic(mnemonicText)
      }
    }

    if (showMnemonic) fetchMnemonic()
  }, [dispatch, accounts, showMnemonic])

  return (
    <>
      <SharedSlideUpMenuPanel header={t("header")} icon="icons/s/lock.svg">
        <div className="content simple_text">
          <SharedWarningMessage text={t("warningMessage")} />
          <div className="exporting_container">
            <SharedAccordion
              headerElement={<div>Wallet</div>}
              contentElement={
                <>
                  {accounts.map((accountTotal) => (
                    <SharedAccountItemSummary accountTotal={accountTotal} />
                  ))}
                </>
              }
            />
            {showMnemonic ? (
              <>
                <div className="mnemonic_container">
                  <SharedSecretText text={mnemonic} width="50%" />
                  <SharedSecretText text={mnemonic} width="50%" />
                </div>
                <SharedButton
                  type="tertiary"
                  size="small"
                  iconMedium="copy"
                  onClick={() => {
                    navigator.clipboard.writeText(mnemonic)
                    dispatch(
                      setSnackbarMessage(t("exportingMnemonic.copySuccess"))
                    )
                  }}
                  center
                >
                  {t("exportingMnemonic.copyBtn")}
                </SharedButton>
              </>
            ) : (
              <>
                <SharedCheckbox
                  label={t("exportingMnemonic.confirmationDesc")}
                  message={t("exportingMnemonic.invalidMessage")}
                  value={isConfirmed}
                  invalid={showInvalidMessage && !isConfirmed}
                  onChange={(value) => {
                    setIsConfirmed(value)
                    setShowInvalidMessage(false)
                  }}
                />
                <SharedButton
                  type="primary"
                  size="medium"
                  isDisabled={!isConfirmed}
                  hideEvents={false}
                  onClick={() => {
                    if (isConfirmed) {
                      setShowMnemonic(true)
                    } else {
                      setShowInvalidMessage(true)
                    }
                  }}
                >
                  {t("exportingMnemonic.showBtn")}
                </SharedButton>
              </>
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
        <div className="explainer">
          <h3 className="simple_text explainer_header">
            {t("explainer.header")}
          </h3>
          {/* TODO: Explainer text is WIP */}
          <p className="simple_text">{t("explainer.text1")}</p>
          <p className="simple_text bold">{t("explainer.text2")}</p>
          <p className="simple_text">{t("explainer.text3")}</p>
          <div className="explainer_buttons">
            <SharedButton
              size="medium"
              type="tertiary"
              iconSmall="close"
              onClick={() => setShowExplainer(false)}
            >
              {tShared("close")}
            </SharedButton>
            <SharedButton
              size="medium"
              type="tertiary"
              iconSmall="new-tab"
              onClick={() => {
                window
                  .open(
                    "https://tahowallet.notion.site/Recovery-Phrases-Private-Keys-31274e1abd2e4055aa63dae5297828b3",
                    "_blank"
                  )
                  ?.focus()
              }}
            >
              {tShared("readMore")}
            </SharedButton>
          </div>
        </div>
      </SharedSlideUpMenu>
      <style jsx>{`
        .content {
        }
        .exporting_container {
        }
        .mnemonic_container {
          display: flex;
        }
      `}</style>
    </>
  )
}
