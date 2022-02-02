import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"

export default function TransactionDetailAddressValue({
  address,
}: {
  address: string
}): ReactElement {
  return (
    <div className="container">
      <SharedButton
        type="tertiaryGray"
        size="small"
        icon="external"
        iconSize="small"
        iconPosition="right"
        onClick={() => {
          window
            .open(`https://etherscan.io/address/${address}`, "_blank")
            ?.focus()
        }}
      >
        {address.slice(0, 7)}...{address.slice(-5)}
      </SharedButton>
      <style jsx>{`
        .container {
          margin-right: -12px; /* Undo button right padding (FIXME?) */
        }
      `}</style>
    </div>
  )
}
