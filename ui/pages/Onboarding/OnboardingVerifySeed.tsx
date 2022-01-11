import React, {
  ReactElement,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react"
import {
  importKeyring,
  setKeyringToVerify,
} from "@tallyho/tally-background/redux-slices/keyrings"
import SharedButton from "../../components/Shared/SharedButton"
import OnboardingStepsIndicator from "../../components/Onboarding/OnboardingStepsIndicator"
import titleStyle from "../../components/Onboarding/titleStyle"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

function KeepInView() {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => element?.current?.scrollIntoView())
  return <div ref={element} />
}

function SuccessMessage({ mnemonic }: { mnemonic: string[] }) {
  const dispatch = useBackgroundDispatch()

  return (
    <div className="success_wrap">
      <span className="message">Congratulations!</span>
      <div className="subtitle">You can now safely use your wallet</div>
      <div className="button_container">
        <SharedButton
          size="medium"
          type="primary"
          linkTo="/"
          onClick={() => {
            dispatch(importKeyring({ mnemonic: mnemonic.join(" ") }))
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

  const [isNotSelected, setIsNotSelected] = useState(
    mnemonicToVerify?.slice().sort(() => Math.random() - 0.5)
  )

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

  return (
    <section>
      <div className="top">
        <div className="wordmark" />
      </div>
      <OnboardingStepsIndicator activeStep={2} />
      <h1 className="serif_header center_text title">Confirm phrase</h1>
      <div className="subtitle">
        This is the only way to restore your tally wallet
      </div>
      <ul className="standard_width_padded button_group center_horizontal selected_wrap">
        {isSelected.map((item, index) => (
          <li className="button_spacing" key={item}>
            <SharedButton
              type="deemphasizedWhite"
              size="small"
              onClick={() => {
                handleRemove(item)
              }}
              icon="close"
            >{`${index + 1} - ${item}`}</SharedButton>
          </li>
        ))}
        <KeepInView />
      </ul>
      <ul className="standard_width_padded button_group center_horizontal bottom">
        {isNotSelected?.length === 0 ? (
          <>
            {isSelected.join() === mnemonicToVerify?.join() ? (
              <SuccessMessage mnemonic={isSelected} />
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
