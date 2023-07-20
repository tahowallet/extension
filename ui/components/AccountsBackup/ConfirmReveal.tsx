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
    <div className="confirmation_container">
      <SharedCheckbox
        size={16}
        label={description}
        invalidMessage={invalidMessage}
        checked={isConfirmed}
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
      <style jsx>{`
        .confirmation_container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      `}</style>
    </div>
  )
}
