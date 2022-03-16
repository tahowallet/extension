import React, { ReactElement, useCallback, useState } from "react"
import { useHistory } from "react-router-dom"
import { importKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import SharedButton from "../../components/Shared/SharedButton"
import OnboardingStepsIndicator from "../../components/Onboarding/OnboardingStepsIndicator"
import titleStyle from "../../components/Onboarding/titleStyle"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

function SuccessMessage({ mnemonic }: { mnemonic: string[] }) {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  return (
    <div className="success_wrap">
      <span className="message">Congratulations!</span>
      <div className="subtitle">You can now safely use your wallet</div>
      <div className="button_container">
        <SharedButton
          size="medium"
          type="primary"
          onClick={async () => {
            await dispatch(
              importKeyring({
                mnemonic: mnemonic.join(" "),
                source: "internal",
              })
            )
            history.push("/")
          }}
        >
          Take me to my wallet
        </SharedButton>
      </div>
      <style jsx>
        {`
          .success_wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            margin-top: 16px;
          }
          .message {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .subtitle {
            color: var(--green-60);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 17px;
          }
          .button_container {
            width: fit-content;
          }
        `}
      </style>
    </div>
  )
}

export default function OnboardingVerifySeed(): ReactElement {
  const [isSelected, setIsSelected] = useState<string[]>([])

  const mnemonicToVerify = useBackgroundSelector((state) => {
    return state.keyrings.keyringToVerify?.mnemonic
  })

  // A random set of 8 from the mnemonic used for verification UI
  const [randomOrderedMnemonicPart] = useState(
    mnemonicToVerify
      ?.slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 8)
  )

  // To display the order of verification in the UI (the unfilled numbers "1 -", "7 -", etc)
  const sortedIndexesOfRandomOrderedMnemonicPart = randomOrderedMnemonicPart
    ?.map((item) => {
      return mnemonicToVerify?.indexOf(item)
    })
    ?.sort((a, b) => {
      if (a === 0) {
        return -1
      }
      return (a && b && a - b) || 0
    })

  function hasUserSelectedCorrectOrder() {
    let result = true
    isSelected.forEach((word, i) => {
      const assignedNumber =
        (sortedIndexesOfRandomOrderedMnemonicPart &&
          sortedIndexesOfRandomOrderedMnemonicPart[i]) ||
        0
      if (mnemonicToVerify && mnemonicToVerify[assignedNumber] !== word) {
        result = false
      }
    })
    return result
  }

  const [isNotSelected, setIsNotSelected] = useState(randomOrderedMnemonicPart)

  const handleAdd = useCallback((item) => {
    setIsSelected((currentlySelected) => [...currentlySelected, item])
    setIsNotSelected((currentlyUnselected) =>
      currentlyUnselected?.filter((e) => e !== item)
    )
  }, [])

  const handleRemove = useCallback((item) => {
    setIsSelected((currentlySelected) =>
      currentlySelected.filter((e) => e !== item)
    )
    setIsNotSelected((currentlyUnselected) => {
      if (currentlyUnselected) {
        return [...currentlyUnselected, item]
      }
      return [item]
    })
  }, [])

  const columnEnds = [
    [0, 4],
    [4, 8],
  ]

  return (
    <section>
      <div className="top">
        <div className="wordmark" />
      </div>
      <OnboardingStepsIndicator activeStep={2} />
      <h1 className="serif_header center_text title">
        Verify secret recovery phrase
      </h1>
      <div className="subtitle">Add the missing words in order</div>
      <div className="words_group">
        {columnEnds.map((positions) => {
          const posOne = positions[0]
          const posTwo = positions[1]
          return (
            <div className="column_wrap">
              <div className="column numbers">
                {sortedIndexesOfRandomOrderedMnemonicPart
                  ?.slice(posOne, posTwo)
                  .map((n) => typeof n === "number" && n + 1)
                  .join(" ")}
              </div>
              <div className="column dashes">- - - -</div>
              <div className="column words">
                {isSelected.slice(posOne, posTwo).map((item) => (
                  <div className="button_spacing" key={item}>
                    <SharedButton
                      type="deemphasizedWhite"
                      size="small"
                      onClick={() => {
                        handleRemove(item)
                      }}
                      icon="close"
                    >
                      {item}
                    </SharedButton>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ul className="standard_width_padded button_group center_horizontal bottom">
        {isNotSelected?.length === 0 ? (
          <>
            {mnemonicToVerify && hasUserSelectedCorrectOrder() ? (
              <SuccessMessage mnemonic={mnemonicToVerify} />
            ) : (
              <span className="error_message">Incorrect order</span>
            )}
          </>
        ) : (
          isNotSelected?.map((item) => (
            <li className="button_spacing">
              <SharedButton
                type="primary"
                size="small"
                onClick={() => {
                  handleAdd(item)
                }}
              >
                {item}
              </SharedButton>
            </li>
          ))
        )}
      </ul>
      <style jsx>
        {`
          ${titleStyle}
          .button_group {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
          }
          .serif_header {
            font-size: 31px;
            margin-top: 16px;
            width: 228px;
            margin-bottom: 7px;
          }
          .subtitle {
            margin-bottom: 22px;
          }
          .button_spacing {
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .bottom {
            height: 160px;
            position: absolute;
            bottom: 20px;
          }
          section {
            padding-top: 25px;
          }
          .selected_wrap {
            max-height: 159px;
            overflow-y: scroll;
            overflow-anchor: none;
          }
          .error_message {
            color: var(--error);
            text-align: center;
            width: 100%;
            font-size: 18px;
            margin-top: 20px;
          }
          .top {
            display: flex;
            width: 100%;
            height: 47px;
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
          .column {
            height: 142px;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            line-height: 38.5px;
            text-align: right;
          }
          .column_wrap {
            display: flex;
            width: 167px;
          }
          .dashes {
            margin-right: 8px;
            margin-left: 5px;
            width: 12px;
          }
          .words {
            width: 69px;
            text-align: left;
          }
          .numbers {
            width: 18px;
            text-align: right;
          }
          .words_group {
            display: flex;
            width: 351px;
            justify-content: space-between;
          }
        `}
      </style>
    </section>
  )
}
