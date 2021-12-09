import classNames from "classnames"
import React, { ReactElement } from "react"

interface Props {
  id?: string
  placeholder: string
  type: "password" | "text"
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
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={classNames({
          error: errorMessage,
        })}
      />
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
          .error {
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
        `}
      </style>
    </>
  )
}

SharedInput.defaultProps = {
  placeholder: "",
  type: "text",
}
