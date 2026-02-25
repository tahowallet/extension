import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import { History, MemoryHistory } from "history"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

const isMemoryHistory = (history: History<unknown>): history is MemoryHistory =>
  "entries" in history

export default function SharedBackButton({
  path,
  onClick,
  withoutBackText,
  hidden = false,
  round = false,
}: {
  path?: string
  onClick?: () => void
  withoutBackText?: boolean
  hidden?: boolean
  round?: boolean
}): ReactElement {
  const { t } = useTranslation()
  const history = useHistory()

  const goBack = () => {
    if (isMemoryHistory(history)) {
      const newLocation = path ?? history.entries.at(-2)?.pathname ?? "/"

      history.push(newLocation, { isBack: true })
    } else {
      history.goBack()
    }
  }

  return (
    <button
      type="button"
      className={classNames({
        hide: hidden || (!onClick && history.length <= 1),
        round: withoutBackText && round,
      })}
      onClick={() => {
        if (onClick) {
          onClick()
        } else {
          goBack()
        }
      }}
    >
      <div className="icon" />
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

        button.round {
          align-items: center;
          background: var(--green-60);
          border-radius: 50%;
          padding: 12px;
        }

        .round .icon {
          background-color: var(--green-120);
        }

        .icon {
          mask: url("./images/chevron_left.svg") center / contain no-repeat;
          width: 16px;
          height: 16px;
          background-color: var(--green-40);
        }

        button:hover .icon {
          background-color: #fff;
        }
      `}</style>
    </button>
  )
}
