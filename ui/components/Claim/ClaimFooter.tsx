import React, { Dispatch, ReactElement, SetStateAction } from "react"

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
  const buttonText = ["Next step", "Next step", "Next step", "Claim"]
  return (
    <div className="footer__wrap">
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
      {step === 2 && <div className="skip">Skip</div>}
      <button className="claim__button" type="button" onClick={advanceStep}>
        {buttonText[step - 1]}
      </button>
      <style jsx>
        {`
          .footer__wrap {
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
          .skip {
            color: #667c7a;
            font-size: 14px;
            cursor: pointer;
          }
          .active {
            width: 16px;
            height: 6px;
            background: #d08e39;
            border-radius: 100px;
            transition: all 0.5s ease-out;
            margin: 0 2px;
          }
          .inactive {
            width: 6px;
            height: 6px;
            background: #667c7a;
            border-radius: 100px;
            transition: all 0.5s ease-in;
            margin: 0 2px;
          }

          .claim__button {
            height: 40px;
            border-radius: 4px;
            background-color: var(--trophy-gold);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #002522;
            font-size: 20px;
            letter-spacing: 0.48px;
            line-height: 24px;
            text-align: center;
            padding: 0px 17px;
          }
        `}
      </style>
    </div>
  )
}
