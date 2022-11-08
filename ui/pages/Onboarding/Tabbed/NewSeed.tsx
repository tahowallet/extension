import {
  generateNewKeyring,
  importKeyring,
} from "@tallyho/tally-background/redux-slices/keyrings"
import React, { ReactElement } from "react"
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useRouteMatch,
} from "react-router-dom"
import { DEFAULT_DERIVATION_PATH } from "@tallyho/tally-background/constants"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../../hooks"
import NewSeedIntro from "./NewSeed/NewSeedIntro"
import NewSeedReview from "./NewSeed/NewSeedReview"
import NewSeedVerify from "./NewSeed/NewSeedVerify"
import OnboardingRoutes from "./Routes"

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

export const NewSeedRoutes = {
  START: OnboardingRoutes.NEW_SEED,
  REVIEW_SEED: `${OnboardingRoutes.NEW_SEED}/new`,
  VERIFY_SEED: `${OnboardingRoutes.NEW_SEED}/verify`,
} as const

export default function NewSeed(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const mnemonic = useBackgroundSelector(
    (state) => state.keyrings.keyringToVerify?.mnemonic
  )
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)

  const history = useHistory()
  const { path } = useRouteMatch()

  const showNewSeedPhrase = () => {
    dispatch(
      generateNewKeyring(
        selectedNetwork.derivationPath ?? DEFAULT_DERIVATION_PATH
      )
    ).then(() => history.push(NewSeedRoutes.REVIEW_SEED))
  }

  const showSeedVerification = () => {
    history.replace(NewSeedRoutes.VERIFY_SEED)
  }

  const onVerifySuccess = (verifiedMnemonic: string[]) => {
    dispatch(
      importKeyring({
        mnemonic: verifiedMnemonic.join(" "),
        source: "internal",
      })
    ).then(() => history.push(OnboardingRoutes.ONBOARDING_COMPLETE))
  }

  if (!areKeyringsUnlocked)
    return (
      <Redirect
        to={{
          pathname: OnboardingRoutes.SET_PASSWORD,
          state: { nextPage: path },
        }}
      />
    )

  return (
    <Switch>
      <Route path={NewSeedRoutes.START} exact>
        <StepContainer step={0}>
          <NewSeedIntro onAccept={showNewSeedPhrase} />
        </StepContainer>
      </Route>
      {mnemonic && (
        <Route path={NewSeedRoutes.REVIEW_SEED}>
          <StepContainer step={1}>
            <NewSeedReview
              mnemonic={mnemonic}
              onReview={showSeedVerification}
            />
          </StepContainer>
        </Route>
      )}
      {mnemonic && (
        <Route path={NewSeedRoutes.VERIFY_SEED}>
          <StepContainer step={2}>
            <NewSeedVerify mnemonic={mnemonic} onVerify={onVerifySuccess} />
          </StepContainer>
        </Route>
      )}
    </Switch>
  )
}
