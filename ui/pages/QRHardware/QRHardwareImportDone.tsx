import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"
import QRHardwarePanelContainer from "./QRHardwarePanelContainer"

export default function QRHardwareImportDone({
  onClose,
}: {
  onClose: () => void
}): ReactElement {
  return (
    <QRHardwarePanelContainer
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
          iconSmall="close"
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
    </QRHardwarePanelContainer>
  )
}
