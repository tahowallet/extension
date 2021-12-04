import React, { ReactElement } from "react"
import classNames from "classnames"

export default function SharedProgressIndicator(props: {
  activeStep: number
  numberOfSteps: number
  onProgressStepClicked: (step: number) => void
}): ReactElement {
  const { activeStep, numberOfSteps, onProgressStepClicked } = props

  return (
    <div className="indicator_wrap">
      {Array(numberOfSteps)
        .fill(undefined)
        .map((_, index) => {
          return (
            <button
              aria-label="step"
              type="button"
              // The nature of this is that the key and index are the same.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
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
          .indicator_wrap {
            display: flex;
          }
        `}
      </style>
    </div>
  )
}
