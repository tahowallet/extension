import React, { ReactElement } from "react"

interface Props {
  id?: string
  placeholder: string
  type: "password" | "text"
  value?: string | number | undefined
  onChange?: (value: string) => void
}

export default function SharedInput(props: Props): ReactElement {
  const { id, placeholder, type, onChange, value } = props

  return (
    <>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
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
        `}
      </style>
    </>
  )
}

SharedInput.defaultProps = {
  placeholder: "",
  type: "text",
}
