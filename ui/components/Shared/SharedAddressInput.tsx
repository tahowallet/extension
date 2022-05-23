import { HexString } from "@tallyho/tally-background/types"
import React, { ReactElement } from "react"
import { useAddressOrNameValidation } from "../../hooks/validation-hooks"

import SharedInput from "./SharedInput"
import SharedLoadingSpinner from "./SharedLoadingSpinner"

type Props = {
  value?: string
  label: string
  onAddressChange: (
    value: { address: HexString; name?: string } | undefined
  ) => void
  onFocus?: () => void
  id?: string
  placeholder?: string
}

export default function SharedAddressInput({
  value,
  label,
  onAddressChange,
  onFocus,
  id,
  placeholder,
}: Props): ReactElement {
  const { errorMessage, handleInputChange, isValidating } =
    useAddressOrNameValidation(onAddressChange)

  return (
    <>
      <SharedInput
        value={value}
        label={label}
        onChange={handleInputChange}
        onFocus={onFocus}
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
