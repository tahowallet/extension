import { HIDE_ADD_SEED } from "@tallyho/tally-background/features/features"
import React, { ReactElement } from "react"
import SharedBackButton from "../../components/Shared/SharedBackButton"
import SharedButton from "../../components/Shared/SharedButton"

export default function OnboardingAddWallet(): ReactElement {
  return (
    <>
      <section className="standard_width">
        <div className="top">
          <SharedBackButton />
          <div className="wordmark" />
        </div>
        <div className="primary_wrap">
          <div className="choice_wrap">
            <h1 className="serif_header">Explore Tally</h1>
            <div className="subtitle">
              Use one of your existing addresses or ENS domain to explore Tally.
              You will not be able to sign transactions until you import a seed.
            </div>
            <SharedButton
              type="primary"
              size="medium"
              linkTo="/onboarding/viewOnlyWallet"
            >
              Add address or ENS domain
            </SharedButton>
          </div>
          <div className="or_divider">or</div>
          <div className="choice_wrap">
            <h1 className="serif_header">Import seed</h1>
            <div className="subtitle">
              Use an existing MetaMask seed; other web3 wallets coming soon!
            </div>
            <SharedButton
              type="primary"
              linkTo={HIDE_ADD_SEED ? undefined : "/onboarding/importMetamask"}
              isDisabled={HIDE_ADD_SEED}
              size="medium"
              onClick={() => {
                if (HIDE_ADD_SEED) {
                  alert("This feature is temporarily disabled.")
                }
              }}
            >
              Add account
            </SharedButton>
          </div>
        </div>
        <div className="forest" />
        <style jsx>
          {`
            .top {
              display: flex;
              width: 100%;
            }
            .wordmark {
              background: url("./images/wordmark@2x.png");
              background-size: cover;
              width: 52px;
              height: 25px;
              position: absolute;
              left: 0px;
              right: 0px;
              margin: 0 auto;
            }
            section {
              background-color: var(--hunter-green);
            }
            .choice_wrap {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .primary_wrap {
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: center;
              margin-top: 32px;
            }
            .or_divider {
              width: 100%;
              position: relative;
              color: var(--green-40);
              margin-top: 32px;
              margin-bottom: 24px;
            }
            .or_divider:after {
              content: "";
              width: calc(50% - 52px / 2);
              height: 1px;
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              background: var(--green-120);
              right: 0;
            }
            .or_divider:before {
              content: "";
              width: calc(50% - 52px / 2);
              height: 1px;
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              background: var(--green-120);
              left: 0;
            }
            section {
              padding-top: 25px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .subtitle {
              color: var(--green-60);
              width: 307px;
              text-align: center;
              line-height: 24px;
              margin-bottom: 24px;
            }
            .forest {
              background: url("./images/dark_forest@2x.png");
              background-size: cover;
              width: 384px;
              height: 141px;
              filter: brightness(0) saturate(100%) invert(6%) sepia(70%)
                saturate(701%) hue-rotate(132deg) brightness(94%) contrast(103%);
              position: absolute;
              left: 0;
              bottom: 0;
              pointer-events: none;
              z-index: -1;
            }
          `}
        </style>
      </section>
    </>
  )
}
