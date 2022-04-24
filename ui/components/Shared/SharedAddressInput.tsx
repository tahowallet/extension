import { HexString } from "@tallyho/tally-background/types"
import React, { ReactElement } from "react"
import { useAddressOrNameValidation } from "../../hooks/validation-hooks"

import SharedInput from "./SharedInput"
import SharedLoadingSpinner from "./SharedLoadingSpinner"

type Props = {
  label: string
  onAddressChange: (value: HexString | undefined) => void
  id?: string
  placeholder?: string
}

export default function SharedAddressInput({
  label,
  onAddressChange,
  id,
  placeholder,
}: Props): ReactElement {
  const { errorMessage, handleInputChange, isValidating } =
    useAddressOrNameValidation(onAddressChange)

  return (
    <>
      <SharedInput
        label={label}
        onChange={handleInputChange}
        errorMessage={errorMessage}
        id={id}
        placeholder={placeholder}
      />
      {isValidating ? (
        <div className="validating_spinner">
          <SharedLoadingSpinner size="small" />
        </div>
      ) : (
        <></>
      )}
      <style jsx>{`
        .validating_spinner {
          float: right;
          margin-top: -32px;
          margin-right: 17px;
        }
      `}</style>
    </>
  )
}

SharedAddressInput.defaultProps = {
  label: "ETH address or name (e.g. ENS or UNS)",
}
