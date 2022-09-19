import React, { ReactElement, useState } from "react"
import SharedButton from "../../Shared/SharedButton"

type SignerBaseFrameProps = {
  signingActionLabel: string
  onConfirm: () => void
  onReject: () => void
  children: ReactElement
}

export default function SignerBaseFrame({
  children,
  signingActionLabel,
  onConfirm,
  onReject,
}: SignerBaseFrameProps): ReactElement {
  const [isOnDelayToSign /* , setIsOnDelayToSign */] = useState(false)

  return (
    <>
      {children}
      <footer>
        <SharedButton size="large" type="secondary" onClick={onReject}>
          Reject
        </SharedButton>

        <SharedButton
          type="primaryGreen"
          size="large"
          onClick={onConfirm}
          showLoadingOnClick
          isDisabled={isOnDelayToSign}
        >
          {signingActionLabel}
        </SharedButton>
      </footer>
    </>
  )
}
