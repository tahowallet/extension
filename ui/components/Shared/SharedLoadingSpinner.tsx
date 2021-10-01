import React, { ReactElement } from "react"

export default function SharedLoadingSpinner(): ReactElement {
  return (
    <>
      <div className="spinner" />
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
        `}
      </style>
    </>
  )
}
