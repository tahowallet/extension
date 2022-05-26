import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import { importKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import SharedButton from "../../../components/Shared/SharedButton"
import { useBackgroundDispatch } from "../../../hooks"
import { OnboardingBox, OnboardingMessageHeader } from "../styles"

function VerifySeedSuccess({ mnemonic }: { mnemonic: string[] }): ReactElement {
  const dispatch = useBackgroundDispatch()
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
          <span>Congratulations!</span>
        </div>
        <p>
          Secret recovery phrase is correct and you can now start using your new
          wallet.
        </p>
      </div>
      <SharedButton
        size="medium"
        type="primary"
        onClick={async () => {
          await dispatch(
            importKeyring({
              mnemonic: mnemonic.join(" "),
              source: "internal",
            })
          )
          history.push("/")
        }}
      >
        Take me to my wallet
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
