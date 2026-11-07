import React, { ReactElement, useCallback, useState } from "react"
import { importSigner } from "@tallyho/tally-background/redux-slices/internal-signer"
import { Redirect, useHistory } from "react-router-dom"
import { isValidMnemonic } from "@ethersproject/hdnode"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useTranslation } from "react-i18next"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  SignerImportSource,
  SignerSourceTypes,
} from "@tallyho/tally-background/services/internal-signer"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import SharedButton from "../../../components/Shared/SharedButton"
import OnboardingDerivationPathSelect, {
  DefaultPathIndex,
} from "../../../components/Onboarding/OnboardingDerivationPathSelect"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreInternalSignersUnlocked,
} from "../../../hooks"
import OnboardingRoutes from "./Routes"
import SharedSeedInput from "../../../components/Shared/SharedSeedInput"
import ImportForm from "./ImportForm"
import { sparkNetworkForDerivationPath } from "@tallyho/tally-background/constants/spark"
import type { NetworkFamily } from "@tallyho/tally-background/networks"
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import {
  importSparkAccount,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"

type Props = {
  nextPage: string
}

export default function ImportSeed(props: Props): ReactElement {
  const { nextPage } = props
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)

  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [path, setPath] = useState<string>(
    selectedNetwork.derivationPath ?? "m/44'/60'/0'/0",
  )
  const [isImporting, setIsImporting] = useState(false)
  const [networkFamily, setNetworkFamily] = useState<NetworkFamily>("EVM")

  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importSeed",
  })

  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  const onInputChange = useCallback((seed: string) => {
    setRecoveryPhrase(seed)
    setErrorMessage("")
  }, [])

  const importWallet = useCallback(async () => {
    const plainRecoveryPhrase = recoveryPhrase
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
    const splitTrimmedRecoveryPhrase = plainRecoveryPhrase.split(" ")
    if (
      splitTrimmedRecoveryPhrase.length !== 12 &&
      splitTrimmedRecoveryPhrase.length !== 24
    ) {
      setErrorMessage(t("errors.phraseLengthError"))
    } else if (isValidMnemonic(plainRecoveryPhrase)) {
      setIsImporting(true)

      if (networkFamily === "SPARK") {
        // Bitcoin on Spark: the Spark SDK derives the account from the same
        // phrase at the chosen Spark path.
        const sparkNetworkType =
          sparkNetworkForDerivationPath(path) ?? "MAINNET"
        const result = (await dispatch(
          importSparkAccount({
            mnemonic: plainRecoveryPhrase,
            source: SignerImportSource.import,
            networkType: sparkNetworkType,
          }),
        )) as unknown as SparkResult<SparkAccount>
        if (result.ok) {
          await dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
          history.push(nextPage)
        } else {
          setErrorMessage(result.error)
          setIsImporting(false)
        }
        return
      }

      const { success } = (await dispatch(
        importSigner({
          type: SignerSourceTypes.keyring,
          mnemonic: plainRecoveryPhrase,
          path,
          source: SignerImportSource.import,
        }),
      )) as unknown as AsyncThunkFulfillmentType<typeof importSigner>

      if (success) {
        await dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
        history.push(nextPage)
      } else {
        setIsImporting(false)
      }
    } else {
      setErrorMessage(t("errors.invalidPhraseError"))
    }
  }, [dispatch, recoveryPhrase, path, t, history, nextPage, networkFamily])

  if (!areInternalSignersUnlocked)
    return (
      <Redirect
        to={{
          pathname: OnboardingRoutes.SET_PASSWORD,
          state: { nextPage: OnboardingRoutes.IMPORT_SEED },
        }}
      />
    )

  return (
    <>
      <ImportForm
        title={t("title")}
        subtitle={t("subtitle")}
        illustration="doggo_import.svg"
        accountFamily={networkFamily}
        onAccountFamilyChange={setNetworkFamily}
      >
        <>
          {/*
           * Other EVM paths and custom paths stay behind the feature flag.
           * Remounted per family so the path resets to that family's default.
           */}
          <div className="select_wrapper">
            <OnboardingDerivationPathSelect
              key={networkFamily}
              networkFamily={networkFamily}
              defaultPath={DefaultPathIndex.bip44}
              onChange={setPath}
              includeEVMAlternatives={isEnabled(
                FeatureFlags.SHOW_IMPORT_DERIVATION_PATH,
              )}
            />
          </div>
          <SharedSeedInput
            onChange={onInputChange}
            label={t("inputLabel")}
            errorMessage={errorMessage}
          />
          <div className="bottom">
            <SharedButton
              id="import"
              style={{
                width: "100%",
                boxSizing: "border-box",
              }}
              size="large"
              type="primary"
              isDisabled={!recoveryPhrase || isImporting}
              onClick={importWallet}
              center
            >
              {t("submit")}
            </SharedButton>
            {isEnabled(FeatureFlags.SHOW_IMPORT_DERIVATION_PATH) && (
              <button
                className="help_button"
                type="button"
                // TODO External link or information modal?
                onClick={() => {}}
              >
                How do I find the recovery phrase?
              </button>
            )}
          </div>
        </>
      </ImportForm>
      <style jsx>{`
        .bottom {
          width: 100%;
          display: flex;
          flex-direction: column;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        .help_button {
          width: 320px;
          text-align: center;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
          font-weight: 500;
        }
        .help_button {
          width: 320px;
          text-align: center;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
          font-weight: 500;
          margin-top: 16px;
        }
        .select_wrapper {
          width: 100%;
          margin-bottom: 24px;
        }
      `}</style>
    </>
  )
}
