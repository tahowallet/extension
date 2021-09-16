import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"

export default function BackButton(): ReactElement {
  const history = useHistory()

  return (
    <button
      type="button"
      className="standard_width_padded"
      onClick={() => history.goBack()}
    >
      <div className="icon_chevron_left" />
      Back
      <style jsx>{`
        button {
          color: var(--green-40);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          display: flex;
          margin-bottom: 10px;
          margin-top: 2px;
        }
        button:hover {
          color: #fff;
        }
        .icon_chevron_left {
          mask-image: url("./images/chevron_down.svg");
          mask-size: 15px 8px;
          width: 15px;
          height: 8px;
          margin-top: 2px;
          background-color: var(--green-40);
          transform: rotate(90deg);
        }
        button:hover .icon_chevron_left {
          background-color: #fff;
        }
      `}</style>
    </button>
  )
}
