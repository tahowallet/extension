import classNames from "classnames"
import React, { ReactElement } from "react"

interface Props {
  id?: string
  placeholder: string
  type: "password" | "text" | "number"
  value?: string | number | undefined
  onChange?: (value: string) => void
  errorMessage?: string
}

export default function SharedInput(props: Props): ReactElement {
  const { id, placeholder, type, onChange, value, errorMessage } = props

  return (
    <>
      <input
        id={id}
        type={type}
        placeholder=" "
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={classNames({
          error: errorMessage,
        })}
      />
      <label htmlFor={id}>{placeholder}</label>
      {errorMessage && <div className="error_message">{errorMessage}</div>}
      <style jsx>
        {`
          input {
            width: 100%;
            height: 48px;
            border-radius: 4px;
            border: 2px solid var(--green-60);
            padding: 0px 16px;
            box-sizing: border-box;
          }
          input::placeholder {
            color: var(--green-40);
          }
          input:focus {
            border: 2px solid var(--green-40);
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          .error,
          .error:focus {
            border-color: var(--error);
          }
          .error_message {
            color: var(--error);
            position: absolute;
            font-weight: 500;
            font-size: 14px;
            line-height: 20px;
            margin-top: 3px;
          }
          label {
            position: absolute;
            pointer-events: none;
            display: flex;
            width: fit-content;
            margin-left: 16px;
            transform: translateY(-32px);
            background-color: var(--hunter-green);
            border-radius: 5px;
            box-sizing: border-box;
            color: var(--green-40);
            transition: font-size 0.2s ease, transform 0.2s ease,
              font-weight 0.2s ease, padding 0.2s ease;
          }
          input:focus ~ label,
          input:not(:placeholder-shown) ~ label {
            transform: translateY(-57px) translateX(-5px);
            font-size: 12px;
            font-weight: 500;
            padding: 0px 6px;
          }
          .error ~ label {
            color: var(--error);
          }
        `}
      </style>
    </>
  )
}

SharedInput.defaultProps = {
  placeholder: "",
  type: "text",
}
