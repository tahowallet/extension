import classNames from "classnames"
import React, { ReactElement } from "react"

type Props = {
  label: string
  onChange: (value: boolean) => void
  value: boolean
  invalid?: boolean
  message?: string
}

export default function SharedCheckbox(props: Props): ReactElement {
  const { label, value, message, invalid, onChange } = props

  return (
    <div className="container">
      <label className="checkbox">
        <input
          checked={value}
          onChange={() => onChange(!value)}
          type="checkbox"
        />
        <span className={classNames("checkmark", { invalid })} />
        <span className="label">{label}</span>
      </label>
      {message && invalid && (
        <span className={classNames("label", { invalid })}>{message}</span>
      )}
      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .checkbox {
          display: flex;
          align-items: start;
          flex-direction: row;
          position: relative;
          cursor: pointer;
          font-size: 14px;
          color: var(--green-60);
          user-select: none;
        }
        .checkbox input {
          position: absolute;
          opacity: 0;
          height: 0;
          width: 0;
        }
        .checkmark {
          top: 5px;
          position: relative;
          height: 16px;
          min-width: 16px;
          border-radius: 3px;
          background-color: transparent;
          margin-right: 10px;
          border: 2px solid var(--green-40);
          box-sizing: border-box;
        }
        .checkmark.invalid {
          border: 2px solid var(--error);
        }
        .checkbox:hover input ~ .checkmark {
          background-color: var(--green-80);
        }
        .checkbox input:checked ~ .checkmark {
          background-color: var(--trophy-gold);
          border: none;
        }
        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
        }
        .checkbox input:checked ~ .checkmark:after {
          display: block;
        }
        .checkbox .checkmark:after {
          left: 5px;
          top: 2px;
          width: 2px;
          height: 7px;
          border: 2px solid var(--hunter-green);
          border-width: 0 3px 3px 0;
          transform: rotate(45deg);
        }
        .label {
          color: var(--green-5);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
        .label.invalid {
          color: var(--error);
        }
      `}</style>
    </div>
  )
}
