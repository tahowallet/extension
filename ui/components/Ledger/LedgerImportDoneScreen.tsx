import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"
import LedgerPanelContainer from "./LedgerPanelContainer"

export default function LedgerImportDoneScreen({
  onClose,
}: {
  onClose: () => void
}): ReactElement {
  return (
    <>
      <LedgerPanelContainer
        indicatorImageSrc="/images/connect_ledger_indicator_connected.svg"
        heading={
          <>
            Congratulations!
            <br />
            You can open Tally now.
          </>
        }
        subHeading="Selected accounts were succesfully connected."
      >
        <div className="button-container">
          <SharedButton
            size="medium"
            icon="close"
            iconPosition="left"
            type="tertiary"
            onClick={onClose}
          >
            Close tab
          </SharedButton>
        </div>
      </LedgerPanelContainer>
      <style jsx>{`
        .button-container {
          display: flex;
          justify-content: center;
          padding: 1rem;
        }
      `}</style>
    </>
  )
}
