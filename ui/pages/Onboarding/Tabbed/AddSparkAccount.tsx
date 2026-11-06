import React, { ReactElement, useState } from "react"
import { Redirect } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  addSparkAccount,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import type { SparkNetworkType } from "@tallyho/tally-background/networks"
import type { RootState } from "@tallyho/tally-background/redux-slices"
import { selectCurrentSparkNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  selectShowTestNetworks,
  setSelectedSparkNetwork,
} from "@tallyho/tally-background/redux-slices/ui"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../../hooks"
import SharedButton from "../../../components/Shared/SharedButton"
import OnboardingTip from "./OnboardingTip"
import OnboardingRoutes from "./Routes"

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * Onboarding step that derives a Spark (Bitcoin layer 2) account from a
 * recovery phrase already in Taho. No new secret is created or imported: the
 * Spark keys come from the chosen wallet's recovery phrase, inside the
 * internal signer.
 */
export default function AddSparkAccount(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.spark",
  })
  const dispatch = useBackgroundDispatch()
  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)
  const keyrings = useBackgroundSelector(
    (state: RootState) => state.internalSigner.keyrings,
  )
  const [keyringID, setKeyringID] = useState<string | undefined>()
  const selectedSparkNetwork = useBackgroundSelector(selectCurrentSparkNetwork)
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  // Follow the network selector: the Spark network the user is looking at,
  // and regtest only for users who have test networks turned on.
  const networkOptions: SparkNetworkType[] = showTestNetworks
    ? ["MAINNET", "REGTEST"]
    : ["MAINNET"]
  const [networkType, setNetworkType] = useState<SparkNetworkType>(
    selectedSparkNetwork &&
      networkOptions.includes(selectedSparkNetwork.sparkNetworkType)
      ? selectedSparkNetwork.sparkNetworkType
      : "MAINNET",
  )
  const [error, setError] = useState<string | undefined>()
  const [isAdding, setIsAdding] = useState(false)
  const [done, setDone] = useState(false)

  if (!areInternalSignersUnlocked) {
    return (
      <Redirect
        to={{
          pathname: OnboardingRoutes.SET_PASSWORD,
          state: { nextPage: OnboardingRoutes.SPARK },
        }}
      />
    )
  }

  if (done) {
    return <Redirect to={OnboardingRoutes.ONBOARDING_COMPLETE} />
  }

  const selectedKeyringID = keyringID ?? keyrings[0]?.id

  const submit = async () => {
    setIsAdding(true)
    setError(undefined)
    const result = (await dispatch(
      addSparkAccount({ networkType, keyringID: selectedKeyringID }),
    )) as unknown as SparkResult<SparkAccount>
    setIsAdding(false)
    if (result.ok) {
      // Show the new account in the popup: switch the network selector to it.
      await dispatch(setSelectedSparkNetwork(result.value.network.chainID))
      setDone(true)
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="fade_in">
      <header>
        <div className="btc_mark" aria-hidden>
          ₿
        </div>
        <div>
          <h1>{t("title")}</h1>
          <div className="subtitle">{t("subtitle")}</div>
        </div>
      </header>
      <div className="content">
        {keyrings.length === 0 ? (
          <p className="notice" role="alert">
            {t("needsRecoveryPhrase")}
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            {keyrings.length > 1 && (
              <fieldset>
                <legend>{t("recoveryPhrase")}</legend>
                {keyrings.map((keyring, index) => (
                  <label
                    key={keyring.id}
                    className={
                      selectedKeyringID === keyring.id
                        ? "choice selected"
                        : "choice"
                    }
                  >
                    <input
                      type="radio"
                      name="keyring"
                      checked={selectedKeyringID === keyring.id}
                      onChange={() => setKeyringID(keyring.id)}
                    />
                    {t("phraseLabel", {
                      index: index + 1,
                      address: keyring.addresses[0]
                        ? shortAddress(keyring.addresses[0])
                        : "",
                    })}
                  </label>
                ))}
              </fieldset>
            )}
            {networkOptions.length > 1 && (
              <fieldset>
                <legend>{t("network")}</legend>
                {networkOptions.map((option) => (
                  <label
                    key={option}
                    className={
                      networkType === option ? "choice selected" : "choice"
                    }
                  >
                    <input
                      type="radio"
                      name="network"
                      value={option}
                      checked={networkType === option}
                      onChange={() => setNetworkType(option)}
                    />
                    {t(`networks.${option}`)}
                  </label>
                ))}
              </fieldset>
            )}
            <SharedButton
              type="primary"
              size="large"
              isFormSubmit
              isLoading={isAdding}
              center
            >
              {t("submit")}
            </SharedButton>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
        <OnboardingTip>{t("tip")}</OnboardingTip>
      </div>
      <style jsx>
        {`
          header {
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
            margin-bottom: 42px;
          }
          .btc_mark {
            width: 80px;
            height: 80px;
            border-radius: 22px;
            background: #f7931a;
            color: #fff;
            font-size: 48px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          header > div {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
          }
          header h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            margin: 0;
          }
          .subtitle {
            color: var(--green-40);
            max-width: 340px;
            text-align: center;
            line-height: 24px;
          }
          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          form {
            display: flex;
            flex-direction: column;
            gap: 24px;
            width: 320px;
            margin-bottom: 52px;
          }
          fieldset {
            border: 0;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          legend {
            color: var(--green-40);
            margin-bottom: 8px;
          }
          .choice {
            border: 1px solid transparent;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 12px 16px;
            border-radius: 8px;
            background: var(--green-95);
            color: var(--green-20);
            cursor: pointer;
          }
          .choice.selected {
            border-color: var(--trophy-gold);
            color: var(--white);
          }
          .choice input {
            accent-color: var(--trophy-gold);
          }
          .notice {
            color: var(--attention);
            max-width: 320px;
            text-align: center;
            margin-bottom: 40px;
          }
          .error {
            color: var(--error);
            overflow-wrap: anywhere;
            margin: 0;
          }
        `}
      </style>
    </section>
  )
}
