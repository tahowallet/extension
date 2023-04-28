import React, { ReactElement, useCallback, useEffect } from "react"
import { generateNewKeyring } from "@tallyho/tally-background/redux-slices/internal-signer"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { useHistory } from "react-router-dom"
import {
  useBackgroundDispatch,
  useAreInternalSignersUnlocked,
  useBackgroundSelector,
} from "../../hooks"

export default function OnboardingInterstitialCreatePhrase(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const history = useHistory()

  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(true)

  const generateThenContinue = useCallback(
    async function generateThenContinue() {
      if (areInternalSignersUnlocked) {
        await dispatch(generateNewKeyring(selectedNetwork.derivationPath))
        history.push("/onboarding/save-seed")
      }
    },
    [areInternalSignersUnlocked, dispatch, history, selectedNetwork]
  )

  useEffect(() => {
    generateThenContinue()
  }, [generateThenContinue])

  return <></>
}
