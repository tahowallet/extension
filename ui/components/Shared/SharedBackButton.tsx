import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import { History, MemoryHistory } from "history"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

export default function SharedBackButton({
  path,
  onClick,
  withoutBackText,
}: {
  path?: string
  onClick?: () => void
  withoutBackText?: boolean
}): ReactElement {
  const { t } = useTranslation()
  const history: History<unknown> | MemoryHistory<unknown> =
    useHistory<unknown>()

  const goBack = () => {
    if ("entries" in history) {
      const newLocation =
        path ??
        (history as MemoryHistory<unknown>).entries.at(-2)?.pathname ??
        "/"
      ;(history as MemoryHistory<unknown>).push(newLocation, { isBack: true })
    } else {
      history.goBack()
    }
  }

  return (
    <button
      type="button"
      className={classNames({
        hide: !onClick && history.length <= 1,
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
      {!withoutBackText && t("shared.backButtonText")}
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
