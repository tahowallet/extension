import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import React, { ReactNode, useEffect } from "react"

export default function ClaimReferrerProvider({
  children,
}: {
  children: ReactNode
}): JSX.Element {
  useEffect(() => {
    if (WEBSITE_ORIGIN === null) {
      throw new Error(`Missing env variable 'WEBSITE_ORIGIN'`)
    }

    const iframe = document.createElement("iframe")
    iframe.src = `${WEBSITE_ORIGIN}/_referral-bridge.html`
    iframe.style.display = `none`

    document.body.append(iframe)

    return () => {
      iframe.remove()
    }
  }, [])

  return <>{children}</>
}
