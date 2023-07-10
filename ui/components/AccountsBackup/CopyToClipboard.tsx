import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  markDismissableItemAsShown,
  selectShouldShowDismissableItem,
} from "@tallyho/tally-background/redux-slices/ui"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedCheckbox from "../Shared/SharedCheckbox"
import SharedBanner from "../Shared/SharedBanner"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

type CopyWarningProps = {
  copyText: string
  copy: () => void
}

export default function CopyToClipboard({
  copyText,
  copy,
}: CopyWarningProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.copyWarning",
  })
  const { t: sharedT } = useTranslation("translation", {
    keyPrefix: "shared",
  })

  const dispatch = useBackgroundDispatch()
  const shouldShowCopyWarning = useBackgroundSelector(
    selectShouldShowDismissableItem("copy-sensitive-material-warning")
  )

  const [isOpen, setIsOpen] = useState(false)
  const [shouldNotDisplayAgain, setShouldNotDisplayAgain] = useState(false)

  const handleSubmitCopyWarning = () => {
    copy()
    setIsOpen(false)

    if (shouldNotDisplayAgain) {
      dispatch(markDismissableItemAsShown("copy-sensitive-material-warning"))
    }
  }

  return (
    <>
      <SharedButton
        type="tertiary"
        size="small"
        iconMedium="copy"
        onClick={() => {
          if (shouldShowCopyWarning) {
            setIsOpen(true)
          } else {
            copy()
          }
        }}
        center
      >
        {copyText}
      </SharedButton>
      <SharedSlideUpMenu
        isOpen={isOpen}
        size="auto"
        close={() => setIsOpen(false)}
      >
        <SharedSlideUpMenuPanel header={t("header")}>
          <div className="content">
            <SharedBanner icon="notif-attention" iconColor="var(--attention)">
              <div className="banner">
                <span className="title">{t("title")}</span>
                <span className="simple_text">{t("description")}</span>
              </div>
            </SharedBanner>
            <div className="checkbox">
              <SharedCheckbox
                size={16}
                label={t("dontAsk")}
                checked={shouldNotDisplayAgain}
                onChange={(value) => setShouldNotDisplayAgain(value)}
              />
            </div>
            <div className="buttons">
              <SharedButton
                size="medium"
                type="secondary"
                onClick={() => setIsOpen(false)}
              >
                {sharedT("cancelBtn")}
              </SharedButton>
              <SharedButton
                size="medium"
                type="primary"
                onClick={() => handleSubmitCopyWarning()}
              >
                {t("submitBtn")}
              </SharedButton>
            </div>
          </div>
        </SharedSlideUpMenuPanel>
        <style jsx>
          {`
            .content {
              padding: 0 16px 16px 16px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 16px;
            }
            .banner {
              display: flex;
              flex-direction: column;
              width: 90%;
            }
            .title {
              font-size: 16px;
              line-height: 24px;
              font-weight: 500;
              color: var(--attention);
              margin-bottom: 12px;
            }
            .checkbox {
              margin-left: 10px;
            }
            .buttons {
              display: flex;
              justify-content: space-between;
              padding-top: 24px;
            }
          `}
        </style>
      </SharedSlideUpMenu>
    </>
  )
}
