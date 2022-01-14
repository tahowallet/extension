import React, { Dispatch, ReactElement, SetStateAction } from "react"
import SharedButton from "../Shared/SharedButton"

interface ClaimFooterProps {
  step: number
  setStep: Dispatch<SetStateAction<number>>
  advanceStep: () => void
}

export default function ClaimFooter({
  step,
  setStep,
  advanceStep,
}: ClaimFooterProps): ReactElement {
  const buttonText = ["Get started", "Continue", "Continue", "Claim"]
  return (
    <footer>
      <div className="steps">
        {new Array(4).fill(null).map((el, index) => {
          return (
            <button
              type="button"
              aria-label="Change step"
              onClick={() => setStep(index + 1)}
              className={step === index + 1 ? "active" : "inactive"}
            />
          )
        })}
      </div>
      <SharedButton type="primary" size="medium" onClick={advanceStep}>
        {buttonText[step - 1]}
      </SharedButton>
      <style jsx>
        {`
          footer {
            position: relative;
            width: 352px;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          .steps {
            display: flex;
            width: 100px;
          }
          .active {
            width: 16px;
            height: 6px;
            background: var(--trophy-gold);
            border-radius: 100px;
            transition: all 0.5s ease-out;
            margin: 0 2px;
          }
          .inactive {
            width: 6px;
            height: 6px;
            background: var(--green-60);
            border-radius: 100px;
            transition: all 0.5s ease-in;
            margin: 0 2px;
          }
        `}
      </style>
    </footer>
  )
}
