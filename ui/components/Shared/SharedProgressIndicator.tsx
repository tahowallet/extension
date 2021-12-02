import React, { ReactElement } from "react"
import classNames from "classnames"

export default function SharedProgressIndicator(props: {
  activeStep: number
  numberOfSteps: number
  onProgressStepClicked: (step: number) => void
}): ReactElement {
  const { activeStep, numberOfSteps, onProgressStepClicked } = props

  return (
    <div className="indictor_wrap">
      {Array(numberOfSteps)
        .fill("")
        .map((item, index) => {
          return (
            <button
              aria-label="step"
              type="button"
              className={classNames("step", {
                active: index === activeStep - 1,
              })}
              onClick={() => {
                onProgressStepClicked(index + 1)
              }}
            />
          )
        })}

      <style jsx>
        {`
          .step {
            background-size: cover;
            background: var(--green-60);
            width: 6px;
            height: 6px;
            border-radius: 3px;
            margin: 0px 3px;
            transition: 0.2s ease-in-out;
          }
          .active {
            width: 16px;
            background: var(--trophy-gold);
          }
          .indictor_wrap {
            display: flex;
          }
        `}
      </style>
    </div>
  )
}
