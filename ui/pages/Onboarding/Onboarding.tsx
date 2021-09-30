import React, { ReactElement, useState } from "react"
import { useHistory, useParams } from "react-router-dom"
import OnboardingImportMetamask from "./OnboardingImportMetamask"
import OnboardingCreatePassword from "./OnboardingCreatePassword"
import OnboardingVerifySeed from "./OnboardingVerifySeed"
import OnboardingSaveSeed from "./OnboardingSaveSeed"
import OnboardingStartTheHunt from "./OnboardingStartTheHunt"

export default function Onboarding(): ReactElement {
  const { startPage } = useParams()
  const history = useHistory()
  const [step, setStep] = useState(Math.floor(startPage))

  return (
    <>
      {step === 0 && (
        <OnboardingCreatePassword
          triggerNextStep={() => {
            setStep(step + 1)
          }}
        />
      )}
      {step === 1 && (
        <OnboardingStartTheHunt
          openNewWalletScreen={() => {
            setStep(2)
          }}
          openMetamaskImportScreen={() => {
            setStep(4)
          }}
        />
      )}
      {step === 2 && (
        <OnboardingSaveSeed
          triggerNextStep={() => {
            setStep(step + 1)
          }}
        />
      )}
      {step === 3 && (
        <OnboardingVerifySeed
          triggerPreviousStep={() => {
            setStep(step - 1)
          }}
        />
      )}
      {step === 4 && (
        <OnboardingImportMetamask onImported={() => history.push("/")} />
      )}
    </>
  )
}
