import React, { ReactElement, useState } from "react"
import { Redirect } from "react-router-dom"
import { getAddressCount } from "@tallyho/tally-background/redux-slices/selectors"
import { HIDE_TOKEN_FEATURES } from "@tallyho/tally-background/features"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../../components/Shared/SharedButton"
import SharedProgressIndicator from "../../components/Shared/SharedProgressIndicator"

const steps = HIDE_TOKEN_FEATURES
  ? [
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
          extraStyles: `margin-top: 21px;`,
        },
        title: "Tally Ho! is a DAO",
        body: `That means Tally Ho is owned by our users. And all profits go straight to the community.`,
        buttonCopy: "Continue",
      },
      {
        image: {
          width: 267,
          height: 236.6,
          fileName: "illustration_onboarding_default",
          extraStyles: `margin-top: 21px;`,
        },
        title: "Tally Ho set as default",
        body: `Tally Ho will open any time you connect to a dapp — even if you select MetaMask. You can disable this anytime from Settings.`,
        buttonCopy: "Get started",
      },
    ]
  : [
      {
        image: {
          width: 384,
          height: 336,
          fileName: "onboarding/graphic_different",
          extraStyles: ``,
        },
        title: "Tally Ho! is different",
        body: "Tally Ho! is the first community-owned wallet for Web3 and DeFi. If you own $DOGGO tokens, you are an owner. ",
        buttonCopy: "Continue",
      },
      {
        image: {
          width: 384,
          height: 336,
          fileName: "onboarding/graphic_token",
          extraStyles: ``,
        },
        title: "The $DOGGO token",
        body: `You can earn $DOGGO in many ways! Check out the Earn and Swap tabs.`,
        buttonCopy: "Continue",
      },
      {
        image: {
          width: 384,
          height: 336,
          fileName: "onboarding/graphic_drop",
          extraStyles: ``,
        },
        title: "$DOGGO token drop",
        body: `If you used Defi in the past, there is a chance you are part of the drop. Check by adding an existing account!`,
        buttonCopy: "Get started",
      },
    ]

export default function OnboardingInfoIntro(): ReactElement {
  const [activeStep, setActiveStep] = useState(1)
  const [redirectToAddWallet, setRedirectToAddWallet] = useState(false)

  const hasAccounts = useBackgroundSelector(
    (state) => getAddressCount(state) > 0
  )

  if (redirectToAddWallet) {
    return <Redirect push to="/onboarding/add-wallet" />
  }

  // If there's an account, return to /wallet
  if (hasAccounts) {
    return <Redirect to="/wallet" />
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
            numberOfSteps={steps.length}
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
            background: linear-gradient(180deg, #002f2b 0%, #00403b 100%);
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
            z-index: 1;
          }
          p {
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            color: var(--green-40);
            width: 336px;
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
            z-index: 1;
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
            margin-top: 0;
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
