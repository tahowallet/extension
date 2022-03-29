import React, { ReactElement } from "react"
import { useDispatch } from "react-redux"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import SharedButton from "../../components/Shared/SharedButton"
import OnboardingStepsIndicator from "../../components/Onboarding/OnboardingStepsIndicator"
import titleStyle from "../../components/Onboarding/titleStyle"
import { useBackgroundSelector } from "../../hooks"

export default function OnboardingSaveSeed(): ReactElement {
  const dispatch = useDispatch()

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
      <div className="words_group">
        {freshMnemonic && (
          <>
            <div className="column_wrap">
              <div className="column numbers">1 2 3 4 5 6 7 8 9 10 11 12</div>
              <div className="column dashes">- - - - - - - - - - - -</div>
              <div className="column words">
                {freshMnemonic?.slice(0, 12).map((word) => {
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
              <div className="column numbers">
                13 14 15 16 17 18 19 20 21 22 23 24
              </div>
              <div className="column dashes">- - - - - - - - - - - -</div>
              <div className="column words">
                {freshMnemonic?.slice(12, 24).map((word) => {
                  return (
                    <>
                      {word}
                      <br />
                    </>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="button_group">
        <SharedButton
          type="primary"
          size="medium"
          icon="arrow_right"
          iconSize="large"
          linkTo="/onboarding/verify-seed"
        >
          I wrote it down
        </SharedButton>
        <SharedButton
          type="tertiary"
          size="medium"
          icon="copy"
          iconSize="large"
          onClick={() => {
            navigator.clipboard.writeText(freshMnemonic?.join(" ") ?? "")
            dispatch(setSnackbarMessage("Copied!"))
          }}
        >
          Copy phrase to clipboard
        </SharedButton>
      </div>
      <style jsx>
        {`
          ${titleStyle}
          .words_group {
            display: flex;
            width: 250px;
            justify-content: space-between;
            height: 272px;
            margin-bottom: 40px;
            margin-top: 5px;
          }
          .serif_header {
            font-size: 31px;
            margin-top: 12px;
            margin-bottom: 5px;
          }
          .numbers {
            width: 18px;
            text-align: right;
          }
          section {
            padding-top: 25px;
          }
          .column {
            height: 142px;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            line-height: 24px;
            text-align: right;
          }
          .column_wrap {
            display: flex;
          }
          .dashes {
            width: 12px;
            margin-right: 8px;
            margin-left: 5px;
          }
          .words {
            width: 69px;
            text-align: left;
          }
          .button_group {
            align-items: center;
            height: 86px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .top {
            display: flex;
            width: 100%;
            height: 40px;
          }
          .wordmark {
            background: url("./images/wordmark@2x.png");
            background-size: cover;
            width: 95px;
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
