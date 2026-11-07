import {
  generateNewKeyring,
  importSigner,
  setKeyringToVerify,
} from "@tallyho/tally-background/redux-slices/internal-signer"
import React, { ReactElement, useState } from "react"
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useRouteMatch,
} from "react-router-dom"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  SignerImportSource,
  SignerSourceTypes,
} from "@tallyho/tally-background/services/internal-signer"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import OnboardingStepsIndicator from "../../../components/Onboarding/OnboardingStepsIndicator"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../../hooks"
import NewSeedIntro from "./NewSeed/NewSeedIntro"
import NewSeedReview from "./NewSeed/NewSeedReview"
import NewSeedVerify from "./NewSeed/NewSeedVerify"
import OnboardingRoutes from "./Routes"
import OnboardingDerivationPathSelect, {
  DefaultPathIndex,
} from "../../../components/Onboarding/OnboardingDerivationPathSelect"
import { sparkNetworkForDerivationPath } from "@tallyho/tally-background/constants/spark"
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import {
  importSparkAccount,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"

function StepContainer({
  children,
  step,
}: {
  children: React.ReactNode
  step: number
}) {
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
  // Which account to add from the new phrase: the default EVM path, or a
  // Bitcoin account on Spark.
  const [accountPath, setAccountPath] = useState<string | undefined>()
  const sparkNetworkType =
    accountPath === undefined
      ? undefined
      : sparkNetworkForDerivationPath(accountPath)
  const mnemonic = useBackgroundSelector(
    (state) => state.internalSigner.keyringToVerify?.mnemonic,
  )
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)

  const history = useHistory()
  const { path } = useRouteMatch()

  const showNewSeedPhrase = () => {
    dispatch(
      generateNewKeyring(selectedNetwork.derivationPath ?? "m/44'/60'/0'/0"),
    ).then(() => history.push(NewSeedRoutes.REVIEW_SEED))
  }

  const showSeedVerification = () => {
    history.replace(NewSeedRoutes.VERIFY_SEED)
  }

  const onVerifySuccess = async (verifiedMnemonic: string[]) => {
    if (sparkNetworkType) {
      const result = (await dispatch(
        importSparkAccount({
          mnemonic: verifiedMnemonic.join(" "),
          source: SignerImportSource.internal,
          networkType: sparkNetworkType,
        }),
      )) as unknown as SparkResult<SparkAccount>
      if (result.ok) {
        dispatch(setKeyringToVerify(null))
        history.push(OnboardingRoutes.ONBOARDING_COMPLETE)
      }
      return
    }

    const { success } = (await dispatch(
      importSigner({
        type: SignerSourceTypes.keyring,
        mnemonic: verifiedMnemonic.join(" "),
        source: SignerImportSource.internal,
      }),
    )) as unknown as AsyncThunkFulfillmentType<typeof importSigner>

    if (success) {
      dispatch(setKeyringToVerify(null))
      history.push(OnboardingRoutes.ONBOARDING_COMPLETE)
    }
  }

  if (!areInternalSignersUnlocked)
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
          <div style={{ width: 356, margin: "24px auto 0" }}>
            <OnboardingDerivationPathSelect
              defaultPath={DefaultPathIndex.bip44}
              onChange={setAccountPath}
              includeEVMAlternatives={false}
              includeSpark
            />
          </div>
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
