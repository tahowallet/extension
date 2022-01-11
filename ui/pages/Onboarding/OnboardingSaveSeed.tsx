import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"
import OnboardingStepsIndicator from "../../components/Onboarding/OnboardingStepsIndicator"
import titleStyle from "../../components/Onboarding/titleStyle"
import { useBackgroundSelector } from "../../hooks"

export default function OnboardingSaveSeed(): ReactElement {
  const freshMnemonic = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  return (
    <section>
      <div className="top">
        <div className="wordmark" />
      </div>
      <OnboardingStepsIndicator activeStep={1} />
      <h1 className="serif_header center_text title">
        Write down your recovery phrase
      </h1>
      <div className="subtitle">
        This is the only way to restore your Tally wallet
      </div>
      {freshMnemonic && (
        <>
          <div className="words_group">
            <div className="column_wrap">
              <div className="column numbers">1 2 3 4 5 6</div>
              <div className="column dashes">- - - - - -</div>
              <div className="column words">
                {freshMnemonic?.slice(0, 6).map((word) => {
                  return (
                    <>
                      {word}
                      <br />
                    </>
                  )
                })}
              </div>
            </div>
            <div className="column_wrap">
              <div className="column numbers">7 8 9 10 11 12</div>
              <div className="column dashes">- - - - - -</div>
              <div className="column words">
                {freshMnemonic?.slice(6, 12).map((word) => {
                  return (
                    <>
                      {word}
                      <br />
                    </>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="button_group">
        <SharedButton
          type="primary"
          size="medium"
          icon="arrow_right"
          iconSize="large"
          linkTo="/onboarding/verifySeed"
        >
          Verify recovery seed
        </SharedButton>
      </div>
      <style jsx>
        {`
          ${titleStyle}
          .words_group {
            display: flex;
            width: 250px;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          .numbers {
            width: 18px;
            text-align: right;
          }
          .dashes {
            width: 12px;
          }
          .words {
            width: 69px;
          }
          section {
            padding-top: 25px;
          }
          .column {
            height: 142px;
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: right;
          }
          .column_wrap {
            display: flex;
          }
          .dashes {
            margin-right: 8px;
            margin-left: 5px;
          }
          .words {
            text-align: left;
          }
          .button_group {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: fixed;
            bottom: 68px;
          }
          .copy_button {
            margin: 16px 0px 4px 0px;
          }
          .top {
            display: flex;
            width: 100%;
            height: 58px;
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
        `}
      </style>
    </section>
  )
}
