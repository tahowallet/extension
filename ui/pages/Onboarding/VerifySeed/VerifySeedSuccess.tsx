import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import { importKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useTranslation } from "react-i18next"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { DEFAULT_DERIVATION_PATH } from "@tallyho/tally-background/constants"
import SharedButton from "../../../components/Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import { OnboardingBox, OnboardingMessageHeader } from "../styles"

function VerifySeedSuccess({
  mnemonic,
  nextPage = "/",
}: {
  mnemonic: string[]
  nextPage?: string
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.seedVerification",
  })
  const dispatch = useBackgroundDispatch()
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const history = useHistory()

  return (
    <>
      <div className="onboarding_box">
        <div className="message_header">
          <img
            className="message_icon"
            src="./images/message_correct.png"
            alt="correct"
          />
          <span>{t("successMessage")}</span>
        </div>
        <p>{t("successExplainer")}</p>
      </div>
      <SharedButton
        size="medium"
        type="primary"
        onClick={async () => {
          await dispatch(
            importKeyring({
              mnemonic: mnemonic.join(" "),
              source: "internal",
              path: selectedNetwork.derivationPath ?? DEFAULT_DERIVATION_PATH,
            })
          )
          history.push(nextPage)
        }}
      >
        {t("successButton")}
      </SharedButton>
      <style jsx>
        {`
          .onboarding_box {
            ${OnboardingBox}
            padding-top: 20px;
          }

          .message_header {
            ${OnboardingMessageHeader}
            color: var(--success);
          }
          .message_icon {
            margin-right: 20px;
            height: 54px;
          }
        `}
      </style>
    </>
  )
}

export default VerifySeedSuccess
