import classNames from "classnames"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import zxcvbn from "zxcvbn"
import { useTranslation } from "react-i18next"
import SharedTooltip from "../Shared/SharedTooltip"

type PasswordBarProps = {
  password: string
}

export default function PasswordStrengthBar(
  props: PasswordBarProps
): ReactElement {
  const { password } = props

  const { t } = useTranslation()
  const [evaluation, setEvaluation] = useState(0)

  useEffect(() => setEvaluation(zxcvbn(password).score), [password])

  const getDescription = useCallback(() => {
    if (!password) return t("passwordStrength.strength")
    if (evaluation < 3) return t("passwordStrength.weak")
    if (evaluation === 3) return t("passwordStrength.average")
    return t("passwordStrength.strong")
  }, [evaluation, password, t])

  return (
    <div
      className={classNames("bar_wrap", {
        bar_weak: password.length && evaluation < 3,
        bar_average: evaluation === 3,
        bar_strong: evaluation > 3,
      })}
    >
      <div className="bar_background bar_shape">
        <div className="bar_fill bar_shape" />
      </div>
      <div className="bar_description">{getDescription()}</div>
      <SharedTooltip width={150}>
        {t("passwordStrength.hintDesc")}
      </SharedTooltip>
      <style jsx>{`
        .bar_wrap {
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          color: var(--green-40);
          transition: color 300ms;
        }
        .bar_shape {
          height: 4px;
          border-radius: 8px;
        }
        .bar_background {
          width: 100%;
          flex-grow: 1;
          background-color: var(--green-60);
        }
        .bar_description {
          text-align: right;
          margin-right: -5px;
          flex: 0 0 60px;
        }
        .bar_fill {
          width: 0%;
          background-color: var(--green-60);
          transition: width 300ms, background-color 300ms;
        }

        .bar_weak.bar_wrap {
          color: var(--error);
        }
        .bar_weak .bar_fill {
          width: 30%;
          background-color: var(--error);
        }

        .bar_average.bar_wrap {
          color: var(--attention);
        }
        .bar_average .bar_fill {
          width: 60%;
          background-color: var(--attention);
        }

        .bar_strong.bar_wrap {
          color: var(--success);
        }
        .bar_strong .bar_fill {
          width: 100%;
          background-color: var(--success);
        }
      `}</style>
    </div>
  )
}
