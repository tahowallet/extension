import React, { ReactElement, useState } from "react"
import { useHistory, Redirect } from "react-router-dom"
import classNames from "classnames"

export default function SharedBackButton(): ReactElement {
  const historyPre: unknown = useHistory()
  const [redirect, setRedirect] = useState(false)
  const history = historyPre as {
    entries: { pathName: string }[]
  }

  if (redirect) {
    return (
      <Redirect
        push
        to={{
          pathname: history.entries[history.entries.length - 1].pathName,
          state: { isBack: true },
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={classNames({
        hide: history.entries.length <= 1,
      })}
      onClick={() => {
        setRedirect(true)
      }}
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
