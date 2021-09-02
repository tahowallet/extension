import React, { ReactElement, useState } from "react"
import { Link } from "react-router-dom"
import SharedButton from "../Shared/SharedButton"
import OnboardingStepsIndicator from "./OnboardingStepsIndicator"
import titleStyle from "./titleStyle"

function SuccessMessage() {
  return (
    <div className="success_wrap">
      <span className="message">Congratulations!</span>
      <div className="subtitle">You can now safely use your wallet</div>
      <div className="button_container">
        <Link to="/">
          <SharedButton
            label="Take me to my wallet"
            size="medium"
            type="primary"
          />
        </Link>
      </div>
      <style jsx>
        {`
          .success_wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          .message {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .subtitle {
            color: var(--green-60);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
          }
          .button_container {
            width: fit-content;
          }
        `}
      </style>
    </div>
  )
}

interface Props {
  triggerPreviousStep: () => void
}

export default function OnboardingVerifySeed(props: Props): ReactElement {
  const { triggerPreviousStep } = props
  const [isSelected, setIsSelected] = useState([])
  const [isNotSelected, setIsNotSelected] = useState(Array(12).fill(""))

  function handleClick() {
    setIsSelected([...isSelected, []])
    setIsNotSelected(isNotSelected.slice(1))
  }

  return (
    <section>
      <button
        type="button"
        className="back_button"
        aria-label="Back"
        onClick={triggerPreviousStep}
      />
      <OnboardingStepsIndicator activeStep={2} />
      <h1 className="serif_header center_text title">
        Save and store your recovery seed
      </h1>
      <div className="subtitle">
        This is the only way to restore your tally wallett
      </div>
      <ul className="standard_width_padded button_group center_horizontal">
        {isSelected.map((item, index) => (
          <li className="button_spacing">
            <SharedButton
              type="specialDisabledWhite"
              size="small"
              label={`${index + 1} - cat`}
              onClick={handleClick}
              icon="close"
              isDisabled
            />
          </li>
        ))}
      </ul>
      <ul className="standard_width_padded button_group center_horizontal bottom">
        {isNotSelected.length === 0 ? (
          <SuccessMessage />
        ) : (
          isNotSelected.map(() => (
            <li className="button_spacing">
              <SharedButton
                type="primary"
                size="small"
                label="cat"
                onClick={handleClick}
              />
            </li>
          ))
        )}
      </ul>
      <style jsx>
        {`
          ${titleStyle}
          .button_group {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
          }
          .button_spacing {
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .bottom {
            height: 160px;
            position: absolute;
            bottom: 0px;
          }
          .back_button {
            background: url("./images/back@2x.png");
            background-size: cover;
            width: 24px;
            height: 24px;
            position: absolute;
            top: 24px;
            left: 24px;
          }
        `}
      </style>
    </section>
  )
}
