import React, { ReactElement, useState } from "react"
import { Redirect } from "react-router-dom"
import SharedButton from "../../components/Shared/SharedButton"
import SharedProgressIndicator from "../../components/Shared/SharedProgressIndicator"

const steps = [
  {
    image: {
      width: 273,
      height: 245.06,
      fileName: "illustration_onboarding_welcome",
      extraStyles: `margin-top: 25px;`,
    },
    title: "Welcome to Tally Ho!",
    body: "The community owned & operated wallet.",
    buttonCopy: "Continue",
  },
  {
    image: {
      width: 267,
      height: 251,
      fileName: "illustration_onboarding_dao",
      extraStyles: ``,
    },
    title: "Tally Ho! is a DAO",
    body: `That means Tally Ho is owned by our users. And all profits go straight to the community.`,
    buttonCopy: "Continue",
  },
  {
    image: {
      width: 244.22,
      height: 247.24,
      fileName: "illustration_onboarding_community_edition",
      extraStyles: `margin-top: 21px;`,
    },
    title: "Test Responsibly",
    body: `Tally Ho is a work in progress! This Community Edition includes limited features and may still have bugs.`,
    buttonCopy: "Continue",
  },
  {
    image: {
      width: 267,
      height: 236.6,
      fileName: "illustration_onboarding_default",
      extraStyles: `margin-top: 21px;`,
    },
    title: "TallyHo set as default",
    body: `TallyHo will open any time you connect to a dapp — even if you select MetaMask. You can disable this anytime from Settings.`,
    buttonCopy: "Get started",
  },
]

export default function OnboardingInfoIntro(): ReactElement {
  const [activeStep, setActiveStep] = useState(1)
  const [redirectToAddWallet, setRedirectToAddWallet] = useState(false)

  if (redirectToAddWallet) {
    return <Redirect push to="/onboarding/add-wallet" />
  }

  return (
    <section>
      <div className="illustration_section">
        <div className="illustration" />
        <div className="forest" />
      </div>
      <div className="bottom_part">
        <div className="bottom_content">
          <SharedProgressIndicator
            numberOfSteps={4}
            activeStep={activeStep}
            onProgressStepClicked={(step) => {
              setActiveStep(step)
            }}
          />
          <h1 className="bottom_title">{steps[activeStep - 1].title} </h1>
          <p>{steps[activeStep - 1].body}</p>
        </div>
        <SharedButton
          type="primary"
          size="large"
          onClick={() => {
            if (activeStep < steps.length) {
              setActiveStep(activeStep + 1)
            } else {
              setRedirectToAddWallet(true)
            }
          }}
        >
          {steps[activeStep - 1].buttonCopy}
        </SharedButton>
      </div>
      <style jsx>
        {`
          .bottom_content {
            margin-top: 28px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .illustration_section {
            height: 380px;
            display: flex;
            background-color: var(--green-95);
          }
          section {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            margin: 12px 0px 0px 0px;
          }
          .forest {
            background: url("./images/dark_forest@2x.png");
            background-size: cover;
            width: 384px;
            height: 141px;
            align-self: flex-end;
            justify-self: flex-end;
          }
          p {
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            color: var(--green-40);
            width: 320px;
            text-align: center;
            margin-top: 5px;
          }
          .bottom_part {
            display: flex;
            position: fixed;
            bottom: 0;
            padding-top: 22px;
            padding-bottom: 32px;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            height: 230px;
            text-align: center;
          }
        `}
      </style>
      <style jsx>
        {`
          .illustration {
            background: url("./images/${steps[activeStep - 1].image
              .fileName}@2x.png");
            background-size: cover;
            width: ${steps[activeStep - 1].image.width}px;
            height: ${steps[activeStep - 1].image.height}px;
            flex-shrink: 0;
            left: 0;
            right: 0;
            margin: 0 auto;
            margin-top: 21px;
            position: absolute;
            animation: fadeIn ease 0.5s;
            ${steps[activeStep - 1].image.extraStyles}
          }
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
        `}
      </style>
    </section>
  )
}
