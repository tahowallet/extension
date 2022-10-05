import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import { useEffect } from "react"

/**
 * By mounting this component, the claim referrer is pulled from the website local storage.
 * This implemented by loading a hidden iframe which points to `/_referral-bridge.html`,
 * which in turn invokes `tally_setClaimReferrer` with the data from the local storage.
 */
export default function ClaimReferralBridge(): null {
  useEffect(() => {
    if (WEBSITE_ORIGIN === null) {
      throw new Error("Missing env variable 'WEBSITE_ORIGIN'")
    }

    const iframe = document.createElement("iframe")
    iframe.src = `${WEBSITE_ORIGIN}/_referral-bridge.html`
    iframe.style.display = "none"

    document.body.append(iframe)

    return () => {
      iframe.remove()
    }
  }, [])

  return null
}
