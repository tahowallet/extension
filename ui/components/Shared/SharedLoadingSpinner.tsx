import React, { ReactElement } from "react"
import classNames from "classnames"

export default function SharedLoadingSpinner(props: {
  size: "small" | "medium"
}): ReactElement {
  const { size } = props

  return (
    <div className={classNames("spinner", size)}>
      <style jsx>
        {`
          .spinner {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid var(--green-80);
            border-top-color: var(--trophy-gold);
            box-sizing: border-box;
            animation: spinner 1s linear infinite;
          }
          @keyframes spinner {
            to {
              transform: rotate(360deg);
            }
          }
          .small {
            width: 14px;
            height: 14px;
            animation: spinner 0.8s linear infinite;
          }
        `}
      </style>
    </div>
  )
}

SharedLoadingSpinner.defaultProps = {
  size: "medium",
}
