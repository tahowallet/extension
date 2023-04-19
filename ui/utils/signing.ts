import React from "react"

export type SignerFrameContextValue = {
  shouldBlockedSigning: boolean
  toggle: (value: boolean) => void
}

export const SignerFrameContext =
  React.createContext<SignerFrameContextValue | null>(null)
