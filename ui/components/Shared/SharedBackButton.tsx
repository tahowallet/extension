import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import classNames from "classnames"

export default function SharedBackButton({
  path,
  onClick,
  withoutBackText,
}: {
  path?: string
  onClick?: () => void
  withoutBackText?: boolean
}): ReactElement {
  const historyPre: unknown = useHistory()
  const history = historyPre as {
    entries: { pathname: string }[]
    push: (path: string, state: { isBack: boolean }) => void
  }

  const goBack = () => {
    const newLocation = path ?? history.entries.at(-2)?.pathname ?? "/"
    history.push(newLocation, { isBack: true })
  }

  return (
    <button
      type="button"
      className={classNames({
        hide: !onClick && history.entries.length <= 1,
      })}
      onClick={() => {
        if (onClick) {
          onClick()
        } else {
          goBack()
        }
      }}
    >
      <div className="icon_chevron_left" />
      {!withoutBackText && "Back"}
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
