import React, { ReactElement } from "react"
import { Link, useHistory } from "react-router-dom"
import SharedButton from "../../../components/Shared/SharedButton"
import { OnboardingBox, OnboardingMessageHeader } from "../styles"

function VerifySeedError(): ReactElement {
  const history = useHistory()

  return (
    <>
      <div className="onboarding_box">
        <div className="message_header">
          <img
            className="message_icon"
            src="./images/message_error.png"
            alt="error"
          />
          <span>Wrong order</span>
        </div>
        <p>
          We are sorry, the recovery phrase you entered did not match.You can
          try to re-order them, but make sure you have them written down.
        </p>
        <p>
          If you prefer you can{" "}
          <Link to="/onboarding/onboarding-interstitial-create-phrase">
            <span className="link">create a new wallet</span>
          </Link>
          .
        </p>
      </div>
      <SharedButton
        size="medium"
        type="primary"
        onClick={() => history.push("/onboarding/save-seed")}
      >
        Try again
      </SharedButton>
      <style jsx>
        {`
          .onboarding_box {
            ${OnboardingBox}
            padding-top: 20px;
          }
          .onboarding_box p {
            margin: 8px 0;
          }
          .onboarding_box .link {
            color: var(--trophy-gold);
          }
          .message_header {
            ${OnboardingMessageHeader}
            color: var(--error);
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

export default VerifySeedError
