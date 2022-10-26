import React, { ReactElement, useState } from "react"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import SeedVerification from "../VerifySeed/SeedVerification"
import { OnboardingSubheader } from "../styles"
import VerifySeedSuccess from "../VerifySeed/VerifySeedSuccess"
import VerifySeedError from "../VerifySeed/VerifySeedError"
import { useBackgroundSelector } from "../../../hooks"

type VerificationStep = "verification" | "success" | "error"

export default function VerifySeed({
  nextPage,
}: {
  nextPage: string
}): ReactElement {
  const [verificationStep, setVerificationStep] =
    useState<VerificationStep>("verification")
  const mnemonic = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  if (!mnemonic) return <span>Recovery phrase not created</span>

  return (
    <div className="verify_section">
      <div className="steps_indicator">
        <OnboardingStepsIndicator activeStep={2} />
      </div>
      <h1 className="serif_header center_text">
        Verify secret recovery phrase
      </h1>
      <div className="subtitle">Add the missing words in order</div>

      {verificationStep === "verification" && (
        <SeedVerification setStep={setVerificationStep} mnemonic={mnemonic} />
      )}
      {verificationStep === "success" && (
        <VerifySeedSuccess mnemonic={mnemonic} nextPage={nextPage} />
      )}
      {verificationStep === "error" && <VerifySeedError />}

      <style jsx>
        {`
          .serif_header {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 46px;
            line-height: 42px;
            margin: 1em auto;
          }
          .subtitle {
            ${OnboardingSubheader}
          }
          .top {
            display: flex;
            justify-content: center;
            width: 100%;
            height: 47px;
          }
          .verify_section {
            text-align: center;
            width: 50%;
            margin: auto;
          }
          .steps_indicator {
            width: 200px;
            margin: auto;
          }
        `}
      </style>
    </div>
  )
}
