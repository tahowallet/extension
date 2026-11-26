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
import SharedRecoveryPhraseInput from "../../../components/Shared/SharedRecoveryPhraseInput"
import {
  checkRecoveryPhrase,
  normalizeRecoveryPhrase,
} from "../../../utils/recoveryPhrase"
import ImportForm from "./ImportForm"

type Props = {
  nextPage: string
}

export default function ImportSeed(props: Props): ReactElement {
  const { nextPage } = props
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)

  const [recoveryPhrase, setRecoveryPhrase] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [unknownWordNumbers, setUnknownWordNumbers] = useState<number[]>([])
  const [path, setPath] = useState<string>(
    selectedNetwork.derivationPath ?? "m/44'/60'/0'/0",
  )
  const [isImporting, setIsImporting] = useState(false)

  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importSeed",
  })

  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  const onInputChange = useCallback((seed: string) => {
    setRecoveryPhrase(seed)
    setErrorMessage("")
  }, [])

  const getUnknownWordsMessage = useCallback(
    (wordNumbers: number[]) =>
      t("errors.unknownWords", {
        count: wordNumbers.length,
        words: new Intl.ListFormat(i18n.language).format(
          wordNumbers.map(String),
        ),
      }),
    [t, i18n.language],
  )

  const getPhraseError = useCallback(
    (phrase: string): string | undefined => {
      if (isEnabled(FeatureFlags.SUPPORT_SEED_WORD_SUGGESTIONS)) {
        const check = checkRecoveryPhrase(phrase)

        switch (check.result) {
          case "unknownWords":
            return getUnknownWordsMessage(check.unknownWordNumbers)
          case "wordCount":
            return t("errors.wordCountError", { count: check.wordCount })
          case "checksum":
            return t("errors.checksumError")
          default:
            return undefined
        }
      }

      const wordCount = phrase.split(" ").length
      if (wordCount !== 12 && wordCount !== 24) {
        return t("errors.phraseLengthError")
      }
      if (!isValidMnemonic(phrase)) {
        return t("errors.invalidPhraseError")
      }
      return undefined
    },
    [t, getUnknownWordsMessage],
  )

  const importWallet = useCallback(async () => {
    const plainRecoveryPhrase = normalizeRecoveryPhrase(recoveryPhrase)
    const phraseError = getPhraseError(plainRecoveryPhrase)

    if (phraseError) {
      setErrorMessage(phraseError)
    } else {
      setIsImporting(true)

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
    }
  }, [dispatch, recoveryPhrase, getPhraseError, path, history, nextPage])

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
      >
        <>
          {isEnabled(FeatureFlags.SHOW_IMPORT_DERIVATION_PATH) && (
            <div className="select_wrapper">
              <OnboardingDerivationPathSelect
                defaultPath={DefaultPathIndex.bip44}
                onChange={setPath}
              />
            </div>
          )}
          {isEnabled(FeatureFlags.SUPPORT_SEED_WORD_SUGGESTIONS) ? (
            <SharedRecoveryPhraseInput
              onChange={onInputChange}
              onUnknownWordsChange={setUnknownWordNumbers}
              label={t("inputLabel")}
              errorMessage={
                errorMessage ||
                (unknownWordNumbers.length > 0
                  ? getUnknownWordsMessage(unknownWordNumbers)
                  : "")
              }
            />
          ) : (
            <SharedSeedInput
              onChange={onInputChange}
              label={t("inputLabel")}
              errorMessage={errorMessage}
            />
          )}
          <div className="bottom">
            <SharedButton
              id="import"
              style={{
                width: "100%",
                boxSizing: "border-box",
              }}
              size={
                isEnabled(FeatureFlags.SHOW_IMPORT_DERIVATION_PATH)
                  ? "large"
                  : "medium"
              }
              type="primary"
              isDisabled={
                !recoveryPhrase || isImporting || unknownWordNumbers.length > 0
              }
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
          margin-top: ${
            isEnabled(FeatureFlags.SHOW_IMPORT_DERIVATION_PATH)
              ? "24px"
              : "48px"
          };
          margin-bottom: ${
            isEnabled(FeatureFlags.SHOW_IMPORT_DERIVATION_PATH)
              ? "16px"
              : "24px"
          };
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
