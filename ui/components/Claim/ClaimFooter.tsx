import {
  claimRewards,
  selectClaimSelections,
  selectIsDelegationSigned,
  setClaimStep,
  signTokenDelegationData,
  selectCurrentlyClaiming,
  selectClaimed,
} from "@tallyho/tally-background/redux-slices/claim"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import React, {
  Dispatch,
  ReactElement,
  SetStateAction,
  useCallback,
  useMemo,
} from "react"
import { Redirect, useHistory } from "react-router-dom"
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
  const history = useHistory()
  const dispatch = useBackgroundDispatch()

  const { selectedDelegate } = useBackgroundSelector(selectClaimSelections)
  const isDelegationSigned = useBackgroundSelector(selectIsDelegationSigned)
  const claimed = useBackgroundSelector(selectClaimed)
  const isCurrentlyClaiming = useBackgroundSelector(selectCurrentlyClaiming)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)

  const lastStepButtonText = useMemo(() => {
    if (selectedDelegate.address !== undefined && !isDelegationSigned) {
      return "Sign Delegation"
    }
    if (isCurrentlyClaiming) {
      return "Claiming..."
    }
    return "Claim"
  }, [isCurrentlyClaiming, isDelegationSigned, selectedDelegate.address])

  const buttonText = useMemo(
    () => [
      "Get started",
      "Continue",
      "Continue",
      "Continue",
      lastStepButtonText,
    ],
    [lastStepButtonText]
  )

  const handleClick = useCallback(async () => {
    if (buttonText[step - 1] === "Sign Delegation") {
      dispatch(signTokenDelegationData())
      history.push("/signData")
    } else if (buttonText[step - 1] === "Claim") {
      dispatch(claimRewards())
      history.push("/signTransaction")
    } else {
      advanceStep()
    }
  }, [buttonText, step, advanceStep, dispatch, history])

  const handleProgressStepClick = (s: number) => {
    setStep(s)
    dispatch(setClaimStep(s))
  }

  if (claimed[currentAccount.address]) {
    showSuccess()
    return <Redirect to="/" />
  }

  return (
    <footer>
      <div className="steps">
        <SharedProgressIndicator
          activeStep={step}
          onProgressStepClicked={(s) => handleProgressStepClick(s)}
          numberOfSteps={buttonText.length}
        />
      </div>
      <SharedButton
        type="primary"
        size="medium"
        onClick={handleClick}
        isDisabled={isCurrentlyClaiming}
      >
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
