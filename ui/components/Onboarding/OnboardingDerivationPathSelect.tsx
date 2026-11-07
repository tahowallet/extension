import React, {
  KeyboardEventHandler,
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { SPARK_DEFAULT_DERIVATION_PATHS } from "@tallyho/tally-background/constants/spark"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import { I18nKey } from "../../_locales/i18n"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedModal from "../Shared/SharedModal"
import SharedSelect, { Option } from "../Shared/SharedSelect"

type DerivationPath = {
  value: string
  label: I18nKey
  hideActiveValue?: boolean
}

export enum DefaultPathIndex {
  ledgerLive,
  bip44,
  ethTestnet,
  ledgerLegacy,
  rootstock,
  rootstockTestnet,
}

// TODO make this network specific
const defaultDerivationPaths: Record<DefaultPathIndex, DerivationPath> = {
  [DefaultPathIndex.ledgerLive]: {
    value: "m/44'/60'/x'/0/0",
    label: "ledger.derivationPaths.ledgerLive",
  },
  [DefaultPathIndex.bip44]: {
    value: "m/44'/60'/0'/0",
    label: "ledger.derivationPaths.bip44",
  },
  [DefaultPathIndex.ethTestnet]: {
    value: "m/44'/1'/0'/0",
    label: "ledger.derivationPaths.ethTestnet",
  },
  [DefaultPathIndex.ledgerLegacy]: {
    value: "m/44'/60'/0'",
    label: "ledger.derivationPaths.ledgerLegacy",
    hideActiveValue: true,
  },
  [DefaultPathIndex.rootstock]: {
    value: "m/44'/137'/0'/0",
    label: "ledger.derivationPaths.rsk",
  },
  [DefaultPathIndex.rootstockTestnet]: {
    value: "m/44'/37310'/0'/0",
    label: "ledger.derivationPaths.rskTestnet",
  },
}

// Spark (Bitcoin layer 2) accounts, derived by the Spark SDK from the same
// recovery phrase. Regtest is only offered when test networks are shown.
const sparkDerivationPaths: {
  mainnet: DerivationPath
  regtest: DerivationPath
} = {
  mainnet: {
    value: SPARK_DEFAULT_DERIVATION_PATHS.MAINNET,
    label: "ledger.derivationPaths.spark",
  },
  regtest: {
    value: SPARK_DEFAULT_DERIVATION_PATHS.REGTEST,
    label: "ledger.derivationPaths.sparkRegtest",
  },
}

const initialCustomPath = {
  coinType: "0",
  account: "0",
  change: "0",
  isReset: true,
}

export default function OnboardingDerivationPathSelect({
  onChange,
  defaultPath,
  includeEVMAlternatives = true,
  includeSpark = false,
}: {
  onChange: (path: string) => void
  defaultPath?: DefaultPathIndex
  /**
   * Offer EVM paths besides the default one, and custom paths. When false,
   * the only EVM option is the default path.
   */
  includeEVMAlternatives?: boolean
  /** Offer Bitcoin-on-Spark accounts alongside the EVM paths. */
  includeSpark?: boolean
}): ReactElement {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "onboarding" })
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)

  const defaultPaths: Option[] = useMemo(
    () =>
      [
        ...(includeEVMAlternatives
          ? Object.values(defaultDerivationPaths)
          : [defaultDerivationPaths[defaultPath ?? DefaultPathIndex.bip44]]),
        ...(includeSpark
          ? [
              sparkDerivationPaths.mainnet,
              ...(showTestNetworks ? [sparkDerivationPaths.regtest] : []),
            ]
          : []),
      ].map((path) => ({
        ...path,
        label: i18n.t(path.label),
      })),
    [i18n, includeEVMAlternatives, includeSpark, showTestNetworks, defaultPath],
  )

  const [derivationPaths, setDerivationPaths] = useState<Option[]>([])

  const [modalStep, setModalStep] = useState(0)
  const [customPath, setCustomPath] = useState(initialCustomPath)
  const [customPathLabel, setCustomPathLabel] = useState("")
  const [customIndex, setCustomIndex] = useState<number | undefined>()
  const defaultIndex =
    customIndex ??
    (defaultPath === undefined
      ? undefined
      : defaultPaths.findIndex(
          ({ value }) => value === defaultDerivationPaths[defaultPath].value,
        ))

  // Reset value to display placeholder after adding a custom path
  const customPathValue = customPath.isReset
    ? ""
    : `m/44'/${customPath.coinType}'/${customPath.account}'/${customPath.change}`

  const coinTypeRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (modalStep === 2 && coinTypeRef.current) {
      coinTypeRef.current.focus()
      coinTypeRef.current.select()
    }
  }, [modalStep])

  const handleAddCustomPath = () => {
    if (
      customPathLabel.trim().length < 1 &&
      customPathValue.trim().length < 1
    ) {
      return
    }

    setModalStep(0)
    onChange(customPathValue)
    // Select the custom option, which is appended after all the others.
    setCustomIndex(defaultPaths.length + derivationPaths.length)

    // TODO It might be considered to save the custom path to the local db
    setDerivationPaths([
      ...derivationPaths,
      { label: customPathLabel, value: customPathValue },
    ])

    // Reset custom path fields
    setCustomPath(initialCustomPath)
    setCustomPathLabel("")
  }

  const handleChangeCustomPath = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPath({
      ...customPath,
      [e.target.name]: e.target.value,
      isReset: false,
    })
  }

  const handleKeypressCustomInput: KeyboardEventHandler<HTMLInputElement> = (
    e,
  ) => {
    if (e.key === "Enter") setModalStep(1)
  }

  const derivationPathOptions = [...defaultPaths, ...derivationPaths]

  return (
    <>
      <SharedModal
        header={t("addDerivationPath")}
        isOpen={modalStep > 0}
        onClose={() => setModalStep((prev) => prev - 1)}
        minHeight={modalStep === 2 ? "463px" : "auto"}
      >
        {modalStep === 1 && (
          <>
            <div className="input_wrap">
              <SharedInput
                id="custom_path_label"
                label={t("pathLabel")}
                onChange={(value) => setCustomPathLabel(value)}
                focusedLabelBackgroundColor="var(--green-120)"
                value={customPathLabel}
              />
            </div>
            <div className="input_wrap">
              <SharedInput
                id="custom_path_value"
                label={`${t("customPath")} (m/44'/0'/0)`}
                onFocus={() => setModalStep(2)}
                focusedLabelBackgroundColor="var(--green-120)"
                value={customPathValue}
              />
            </div>

            <SharedButton
              type="primary"
              size="medium"
              onClick={handleAddCustomPath}
            >
              {t("addDerivationPath")}
            </SharedButton>
          </>
        )}
        {modalStep === 2 && (
          <div className="input_wrap custom">
            <span>m/44&#39;/</span>
            <input
              ref={coinTypeRef}
              name="coinType"
              className="custom_input"
              value={customPath.coinType}
              onChange={handleChangeCustomPath}
              onKeyPress={handleKeypressCustomInput}
            />
            <span>&#39;/</span>
            <input
              name="account"
              className="custom_input"
              value={customPath.account}
              onChange={handleChangeCustomPath}
              onKeyPress={handleKeypressCustomInput}
            />
            <span>&#39;/</span>
            <input
              name="change"
              className="custom_input"
              value={customPath.change}
              onChange={handleChangeCustomPath}
              onKeyPress={handleKeypressCustomInput}
            />
          </div>
        )}
      </SharedModal>
      <SharedSelect
        label={t("derivationPath")}
        options={derivationPathOptions}
        onChange={onChange}
        defaultIndex={defaultIndex}
        triggerLabel={includeEVMAlternatives ? t("addCustomPath") : undefined}
        onTrigger={includeEVMAlternatives ? () => setModalStep(1) : undefined}
        showValue
        showOptionValue
        placement="top"
        width="100%"
      />
      <style jsx>{`
        .input_wrap {
          margin-bottom: 32px;
        }
        .input_wrap.custom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 16px;
          line-height: 24px;
          font-weight: 600;
          margin-top: 6px;
        }
        .custom_input {
          box-sizing: border-box;
          padding: 12px 16px;
          color: var(--green-5);
          border: 2px solid var(--green-60);
          border-radius: 4px;
          width: 60px;
          height: 48px;
        }
        .custom_input:last-child {
          width: 48px;
        }
      `}</style>
    </>
  )
}
