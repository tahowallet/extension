import React, { ReactElement, useCallback, useEffect } from "react"
import { generateNewKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks"

export default function OnboardingInterstitialCreatePhrase(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)

  const generateThenContinue = useCallback(
    async function generateThenContinue() {
      if (areKeyringsUnlocked) {
        await dispatch(generateNewKeyring())
        history.push("/onboarding/save-seed")
      }
    },
    [areKeyringsUnlocked, dispatch, history]
  )

  useEffect(() => {
    generateThenContinue()
  }, [generateThenContinue])

  return <></>
}
