import React, { ReactElement, useState } from "react"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import SeedVerification from "../VerifySeed/SeedVerification"
import { OnboardingHeader, OnboardingSubheader } from "../styles"
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
  const mnemonic = useBackgroundSelector(
    (state) => state.keyrings.keyringToVerify?.mnemonic
  )

  if (!mnemonic) return <span>Recovery phrase not created</span>

  return (
    <>
      <OnboardingStepsIndicator activeStep={2} />
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
            ${OnboardingHeader}
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
        `}
      </style>
    </>
  )
}
