import React, { ReactElement } from "react"

interface Props {
  placeholder?: string
}

export default function SharedInput(props: Props): ReactElement {
  const { placeholder } = props

  return (
    <>
      <input type="password" placeholder={placeholder} />
      <style jsx>
        {`
          input {
            width: 260px;
            height: 48px;
            border-radius: 4px;
            border: 2px solid var(--green-60);
            padding-left: 16px;
            box-sizing: border-box;
          }
          input::placeholder {
            color: #fff;
          }
        `}
      </style>
    </>
  )
}

SharedInput.defaultProps = {
  placeholder: "",
}
