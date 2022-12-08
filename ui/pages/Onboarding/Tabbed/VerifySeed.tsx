import React, { ReactElement } from "react"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import SeedVerification from "./SeedVerification"
import { useBackgroundSelector } from "../../../hooks"

export default function VerifySeed({
  nextPage,
}: {
  nextPage: string
}): ReactElement {
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

        <SeedVerification mnemonic={mnemonic} nextPage={nextPage} />
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
