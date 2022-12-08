import React, { ReactElement, useState } from "react"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import SeedVerification from "../VerifySeed/SeedVerification"
import VerifySeedSuccess from "../VerifySeed/VerifySeedSuccess"
import VerifySeedError from "../VerifySeed/VerifySeedError"
import { useBackgroundSelector } from "../../../hooks"

type VerificationStep = "verification" | "success" | "error"

export default function VerifySeed({
  nextPage,
}: {
  nextPage: string
}): ReactElement {
  const [verificationStep] = useState<VerificationStep>("verification")
  const mnemonic = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  if (!mnemonic) return <span>Recovery phrase not created</span>

  return (
    <div>
      <div className="steps_indicator">
        <OnboardingStepsIndicator activeStep={2} />
      </div>
      <section className="verify_section fadeIn">
        <h1 className="center_text">Verify recovery phrase</h1>
        <div className="subtitle center_text">
          Click on each word in the order that you are asked to
        </div>

        {verificationStep === "verification" && (
          <SeedVerification mnemonic={mnemonic} nextPage="/onboarding/done" />
        )}
        {verificationStep === "success" && (
          <VerifySeedSuccess mnemonic={mnemonic} nextPage={nextPage} />
        )}
        {verificationStep === "error" && <VerifySeedError />}
      </section>
      <style jsx>
        {`
          h1 {
            font-family: "Quincy CF";
            font-style: normal;
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            color: var(--white);
            margin: 24px 0 4px;
          }

          .subtitle {
            font-family: "Segment";
            font-style: normal;
            font-weight: 400;
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
            margin-bottom: 41px;
          }

          .top {
            display: flex;
            justify-content: center;
            width: 100%;
            height: 47px;
          }

          .verify_section {
            max-width: 450px;
            margin: 0 auto;
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
