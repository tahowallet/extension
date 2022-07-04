import classNames from "classnames"
import React, { ReactElement } from "react"
import SharedTooltip from "./SharedTooltip"

type PasswordBarProps = {
  strength?: PasswordStrength
}

export type PasswordStrength = "Weak" | "Average" | "Strong"

export default function SharedPasswordBar(
  props: PasswordBarProps
): ReactElement {
  const { strength } = props

  return (
    <div
      className={classNames("bar_wrap", {
        bar_weak: strength === "Weak",
        bar_average: strength === "Average",
        bar_strong: strength === "Strong",
      })}
    >
      <div className="bar_background bar_shape">
        <div className="bar_fill bar_shape" />
      </div>
      <div className="bar_description">{strength ?? "Strength"}</div>
      <SharedTooltip width={180}>
        For a strong password use a mix of: Lowecase, Uppercase, symbols and
        numbers.
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
          background-color: #fff;
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
