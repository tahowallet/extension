import { truncateAddress } from "@tallyho/tally-background/lib/utils"
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
        iconSmall="new-tab"
        iconPosition="right"
        onClick={() => {
          window
            .open(`https://etherscan.io/address/${address}`, "_blank")
            ?.focus()
        }}
      >
        {truncateAddress(address)}
      </SharedButton>
      <style jsx>{`
        .container {
          margin-right: -12px; /* Undo button right padding (FIXME?) */
        }
      `}</style>
    </div>
  )
}
