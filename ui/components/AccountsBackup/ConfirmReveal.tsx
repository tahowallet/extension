import React, { ReactElement, useState } from "react"
import SharedButton from "../Shared/SharedButton"
import SharedCheckbox from "../Shared/SharedCheckbox"

export default function ConfirmReveal({
  description,
  invalidMessage,
  confirmButton,
  onConfirm,
}: {
  description: string
  invalidMessage: string
  confirmButton: string
  onConfirm: () => void
}): ReactElement {
  const [showInvalidMessage, setShowInvalidMessage] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  return (
    <>
      <div className="confirmation_container">
        <SharedCheckbox
          label={description}
          message={invalidMessage}
          value={isConfirmed}
          invalid={showInvalidMessage && !isConfirmed}
          onChange={(value) => {
            setIsConfirmed(value)
            setShowInvalidMessage(false)
          }}
        />
        <div>
          <SharedButton
            type="primary"
            size="medium"
            isDisabled={!isConfirmed}
            hideEvents={false}
            onClick={() => {
              if (isConfirmed) {
                onConfirm()
              } else {
                setShowInvalidMessage(true)
              }
            }}
          >
            {confirmButton}
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        .confirmation_container {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          margin-top: 16px;
        }
      `}</style>
    </>
  )
}
