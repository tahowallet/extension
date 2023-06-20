import classNames from "classnames"
import React, { ReactElement } from "react"

type Props = {
  label?: string
  size: number
  checked: boolean
  disabled?: boolean
  invalid?: boolean
  invalidMessage?: string
  onChange: (value: boolean) => void
}

export default function SharedCheckbox(props: Props): ReactElement {
  const { label, size, checked, disabled, invalid, invalidMessage, onChange } =
    props

  return (
    <div
      className={classNames({
        container: invalidMessage,
      })}
    >
      <label className="checkbox_label">
        <input
          className="checkbox_input"
          type="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <div
          className={classNames("checkbox_box", {
            checked,
            disabled,
            invalid,
          })}
        />
        <span className="label">{label}</span>
      </label>
      <span
        className={classNames("label message", {
          visible: invalidMessage && invalid,
        })}
      >
        {invalidMessage}
      </span>
      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .checkbox_label {
          display: flex;
          flex-direction: row;
          cursor: pointer;
          margin: unset;
        }

        .checkbox_input {
          display: none;
        }

        .checkbox_box {
          min-width: ${size}px;
          height: ${size}px;
          border-radius: 2px;
          box-sizing: border-box;
          cursor: pointer;
          margin-right: 8px;
          margin-top: ${label ? 4 : 0}px;
        }

        .checkbox_box.disabled {
          background: var(--green-80);
        }

        .checkbox_box:not(.checked) {
          border: 2px solid var(--green-60);
        }

        .checkbox_box.checked {
          background-color: var(--trophy-gold);
        }

        .checkbox_box.invalid {
          border: 2px solid var(--error);
        }

        .checkbox_box.checked::before {
          content: "";
          display: block;
          margin: ${size * 0.2}px;
          width: ${size * 0.6}px;
          height: ${size * 0.6}px;
          background: no-repeat center / cover url("/images/checkmark@2x.png");
        }

        .label {
          color: var(--green-5);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }

        .message {
          visibility: hidden;
          color: var(--error);
        }

        .message.visible {
          visibility: visible;
        }
      `}</style>
    </div>
  )
}
