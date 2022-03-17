import React, { ReactElement } from "react"
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer"
import SharedButton from "../../components/Shared/SharedButton"

export default function LedgerImportDone({
  onClose,
}: {
  onClose: () => void
}): ReactElement {
  return (
    <LedgerPanelContainer
      indicatorImageSrc="/images/connect_ledger_indicator_connected.svg"
      heading={
        <>
          Congratulations!
          <br />
          You can open Tally Ho now.
        </>
      }
      subHeading="Selected accounts were succesfully connected."
    >
      <div className="button_container">
        <SharedButton
          size="medium"
          icon="close"
          iconPosition="right"
          type="tertiary"
          onClick={onClose}
        >
          Close tab
        </SharedButton>
      </div>
      <style jsx>{`
        .button_container {
          display: flex;
          justify-content: center;
          padding: 1rem;
        }
      `}</style>
    </LedgerPanelContainer>
  )
}
