import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"

export default function TransactionDetailAddressValue({
  value,
}: {
  value: string
}): ReactElement {
  return (
    <SharedButton
      type="tertiaryWhite"
      size="small"
      icon="external"
      iconSize="small"
      iconPosition="right"
    >
      {value.slice(0, 7)}...{value.slice(-5)}
    </SharedButton>
  )
}
