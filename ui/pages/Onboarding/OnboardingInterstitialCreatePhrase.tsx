import React, { ReactElement, useCallback, useEffect } from "react"
import { generateNewKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { useHistory } from "react-router-dom"
import {
  useBackgroundDispatch,
  useAreKeyringsUnlocked,
  useBackgroundSelector,
} from "../../hooks"

export default function OnboardingInterstitialCreatePhrase(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const history = useHistory()

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)

  const generateThenContinue = useCallback(
    async function generateThenContinue() {
      if (areKeyringsUnlocked) {
        await dispatch(generateNewKeyring(selectedNetwork.derivationPath))
        history.push("/onboarding/save-seed")
      }
    },
    [areKeyringsUnlocked, dispatch, history, selectedNetwork]
  )

  useEffect(() => {
    generateThenContinue()
  }, [generateThenContinue])

  return <></>
}
