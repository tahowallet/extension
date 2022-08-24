import React, {
  KeyboardEventHandler,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedModal from "../Shared/SharedModal"
import SharedSelect, { Option } from "../Shared/SharedSelect"

// TODO make this network specific
const initialDerivationPaths: Option[] = [
  {
    value: "m/44'/60'/x'/0/0",
    label: "Ledger Live",
  },
  {
    value: "m/44'/60'/0'/0",
    label: "BIP 44 (Trezor, 🦊)",
  },
  {
    value: "m/44'/1'/0'/0",
    label: "Ethereum Testnet",
  },
  {
    value: "m/44'/60'/0'",
    label: "Ledger Legacy",
    hideActiveValue: true,
  },
  {
    value: "m/44'/137'/0'/0",
    label: "RSK",
  },
  {
    value: "m/44'/37310'/0'/0",
    label: "RSK Testnet",
  },
]

const initialCustomPath = {
  coinType: "0",
  account: "0",
  change: "0",
  isReset: true,
}

export default function OnboardingDerivationPathSelect({
  onChange,
}: {
  onChange: (path: string) => void
}): ReactElement {
  const [derivationPaths, setDerivationPaths] = useState(initialDerivationPaths)

  const [modalStep, setModalStep] = useState(0)
  const [customPath, setCustomPath] = useState(initialCustomPath)
  const [customPathLabel, setCustomPathLabel] = useState("")
  const [defaultIndex, setDefaultIndex] = useState<number>()

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
    setModalStep(0)
    onChange(customPathValue)
    // Change active index of the Select with custom option
    setDefaultIndex(derivationPaths.length)

    // TODO It might be considered to save the custom path to the local db
    setDerivationPaths([
      ...derivationPaths,
      { label: customPathLabel, value: customPathValue as string },
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
    e
  ) => {
    if (e.key === "Enter") setModalStep(1)
  }

  return (
    <>
      <SharedModal
        header="Add derivation path"
        isOpen={modalStep > 0}
        onClose={() => setModalStep((prev) => prev - 1)}
        minHeight={modalStep === 2 ? "463px" : "auto"}
      >
        {modalStep === 1 && (
          <>
            <div className="input_wrap">
              <SharedInput
                id="custom_path_label"
                label="Label"
                onChange={(value) => setCustomPathLabel(value)}
                focusedLabelBackgroundColor="var(--green-120)"
                value={customPathLabel}
              />
            </div>
            <div className="input_wrap">
              <SharedInput
                id="custom_path_value"
                label="Custom path (m/44'/0'/0)"
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
              Add derivation path
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
        label="Derivation path"
        options={derivationPaths}
        onChange={onChange}
        defaultIndex={defaultIndex}
        triggerLabel="Add custom path"
        onTrigger={() => setModalStep(1)}
        showValue
        showOptionValue
        placement="top"
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
