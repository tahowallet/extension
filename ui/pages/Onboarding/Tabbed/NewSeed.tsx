import { generateNewKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import React, { ReactElement } from "react"
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useRouteMatch,
} from "react-router-dom"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../../hooks"
import NewSeedIntro from "./NewSeed/NewSeedIntro"
import NewSeedReview from "./NewSeed/NewSeedReview"
import NewSeedVerify from "./NewSeed/NewSeedVerify"
import SetPassword from "./SetPassword"

const StepContainer = ({
  children,
  step,
}: {
  children: React.ReactNode
  step: number
}) => {
  return (
    <div className="steps_section">
      <div className="steps_indicator">
        <OnboardingStepsIndicator activeStep={step} />
      </div>
      {children}
      <style jsx>
        {`
          .steps_section {
            margin: auto;
          }
          .steps_indicator {
            max-width: 200px;
            margin: auto;
          }
        `}
      </style>
    </div>
  )
}

export default function SaveSeed(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const mnemonic = useBackgroundSelector(
    (state) => state.keyrings.keyringToVerify?.mnemonic
  )

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const history = useHistory()
  const { path } = useRouteMatch()

  const showNewSeedPhrase = () => {
    dispatch(generateNewKeyring()).then(() => history.push(`${path}/new`))
  }

  const showSeedVerification = () => {
    history.push(`${path}/verify`)
  }

  const onVerifySuccess = () => {
    history.push(`${path}/../done`)
  }

  if (!areKeyringsUnlocked) {
    return <Redirect to={`${path}/set-password`} />
  }

  return (
    <Switch>
      <Route path={`${path}/set-password`}>
        <SetPassword nextPage={`${path}`} />
      </Route>
      <Route path={`${path}`} exact>
        <StepContainer step={0}>
          <NewSeedIntro onAccept={showNewSeedPhrase} />
        </StepContainer>
      </Route>
      {mnemonic && (
        <Route path={`${path}/new`}>
          <StepContainer step={1}>
            <NewSeedReview
              mnemonic={mnemonic}
              onReview={showSeedVerification}
            />
          </StepContainer>
        </Route>
      )}
      {mnemonic && (
        <Route path={`${path}/verify`}>
          <StepContainer step={2}>
            <NewSeedVerify mnemonic={mnemonic} onVerify={onVerifySuccess} />
          </StepContainer>
        </Route>
      )}
    </Switch>
  )
}
