import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import classNames from "classnames"

export default function SharedBackButton(): ReactElement {
  const history = useHistory()

  return (
    <button
      type="button"
      className={classNames("standard_width_padded", {
        hide: history.length <= 1,
      })}
      onClick={() => history.goBack()}
    >
      <div className="icon_chevron_left" />
      <style jsx>{`
        button {
          color: var(--green-40);
          font-size: 12px;
          font-weight: 500;
          line-height: 16px;
          display: flex;
          margin-bottom: 10px;
          margin-top: 2px;
          position: fixed;
          top: 25px;
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
