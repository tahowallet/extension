import React, { ReactElement, useState } from "react"
import OnboardingStepsIndicator from "../../components/Onboarding/OnboardingStepsIndicator"
import SeedVerification from "./VerifySeed/SeedVerification"
import {
  OnboardingContainer,
  OnboardingHeader,
  OnboardingSubheader,
} from "./styles"
import VerifySeedSuccess from "./VerifySeed/VerifySeedSuccess"
import VerifySeedError from "./VerifySeed/VerifySeedError"
import { useBackgroundSelector } from "../../hooks"

type VerificationStep = "verification" | "success" | "error"

export default function OnboardingVerifySeed(): ReactElement {
  const [verificationStep, setVerificationStep] =
    useState<VerificationStep>("verification")
  const mnemonic = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  if (!mnemonic) return <span>Recovery phrase not created</span>

  return (
    <section className="onboarding_container">
      <div className="top">
        <div className="wordmark" />
      </div>
      <OnboardingStepsIndicator activeStep={2} />
      <h1 className="serif_header center_text">
        Verify secret recovery phrase
      </h1>
      <div className="subtitle">Add the missing words in order</div>

      {verificationStep === "verification" && (
        <SeedVerification setStep={setVerificationStep} mnemonic={mnemonic} />
      )}
      {verificationStep === "success" && (
        <VerifySeedSuccess mnemonic={mnemonic} />
      )}
      {verificationStep === "error" && <VerifySeedError />}

      <style jsx>
        {`
          .serif_header {
            ${OnboardingHeader}
          }
          .onboarding_container {
            ${OnboardingContainer}
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
          .wordmark {
            background: url("./images/wordmark@2x.png");
            background-size: cover;
            width: 95px;
            height: 25px;
          }
        `}
      </style>
    </section>
  )
}
