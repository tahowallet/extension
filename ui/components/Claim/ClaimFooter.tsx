import {
  claimRewards,
  selectClaimSelections,
  signTokenDelegationData,
} from "@tallyho/tally-background/redux-slices/claim"
import React, {
  Dispatch,
  ReactElement,
  SetStateAction,
  useCallback,
  useMemo,
} from "react"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedProgressIndicator from "../Shared/SharedProgressIndicator"

interface ClaimFooterProps {
  step: number
  setStep: Dispatch<SetStateAction<number>>
  advanceStep: () => void
  showSuccess: () => void
}

export default function ClaimFooter({
  step,
  setStep,
  advanceStep,
  showSuccess,
}: ClaimFooterProps): ReactElement {
  const buttonText = useMemo(
    () => ["Get started", "Continue", "Continue", "Continue", "Claim"],
    []
  )
  const history = useHistory()
  const dispatch = useBackgroundDispatch()

  const { selectedDelegate } = useBackgroundSelector(selectClaimSelections)

  const handleClick = useCallback(async () => {
    if (buttonText[step - 1] === "Claim") {
      if (selectedDelegate) {
        dispatch(signTokenDelegationData())
        history.push("/signData")
        return
      }
      dispatch(claimRewards())
      history.push("/signTransaction")
      // showSuccess()
    } else {
      advanceStep()
    }
  }, [
    buttonText,
    step,
    // showSuccess,
    advanceStep,
    selectedDelegate,
    dispatch,
    history,
  ])

  return (
    <footer>
      <div className="steps">
        <SharedProgressIndicator
          activeStep={step}
          onProgressStepClicked={(s) => setStep(s)}
          numberOfSteps={buttonText.length}
        />
      </div>

      <SharedButton type="primary" size="medium" onClick={handleClick}>
        {buttonText[step - 1]}
      </SharedButton>
      <style jsx>
        {`
          footer {
            position: relative;
            width: 352px;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 auto;
            margin-bottom: 16px;
          }
          .steps {
            display: flex;
            width: 100px;
          }
          .active {
            width: 16px;
            height: 6px;
            background: var(--trophy-gold);
            border-radius: 100px;
            transition: all 0.5s ease-out;
            margin: 0 2px;
          }
          .inactive {
            width: 6px;
            height: 6px;
            background: var(--green-60);
            border-radius: 100px;
            transition: all 0.5s ease-in;
            margin: 0 2px;
          }
        `}
      </style>
    </footer>
  )
}
