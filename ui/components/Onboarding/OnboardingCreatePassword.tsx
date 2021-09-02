import React, { ReactElement } from "react"
import SharedInput from "../Shared/SharedInput"
import SharedButton from "../Shared/SharedButton"
import titleStyle from "./titleStyle"

interface Props {
  triggerNextStep: () => void
}

export default function OnboardingCreatePassword(props: Props): ReactElement {
  const { triggerNextStep } = props

  return (
    <section>
      <div className="full_logo" />
      <h1 className="serif_header">Good hunting.</h1>
      <div className="subtitle">The decentralized web awaits.</div>
      <SharedInput placeholder="Password" />
      <div className="repeat_password_wrap">
        <SharedInput placeholder="Repeat Password" />
      </div>
      <SharedButton
        type="primary"
        size="large"
        label="Begin the hunt"
        onClick={triggerNextStep}
      />
      <div className="restore">
        <SharedButton
          type="tertiary"
          size="medium"
          label="Restoring account?"
        />
      </div>
      <style jsx>
        {`
          ${titleStyle}
          .full_logo {
            background: url("./images/full_logo@2x.png");
            background-size: cover;
            width: 118px;
            height: 120px;
            margin-bottom: 17px;
          }
          .repeat_password_wrap {
            margin-top: 19px;
            margin-bottom: 24px;
          }
          .restore {
            position: fixed;
            bottom: 26px;
          }
        `}
      </style>
    </section>
  )
}
