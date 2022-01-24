import classNames from "classnames"
import React, { ReactElement, useEffect, useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"

// TODO make this network specific
const initialDerivationPaths: { value: string; label: string }[] = [
  {
    value: "m/44'/60'/0'/0",
    label: "Ethereum",
  },
  {
    value: "m/44'/1'/0'/0",
    label: "Ethereum Testnet",
  },
  {
    value: "m/44'/61'/0'/0",
    label: "Trezor",
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [derivationPaths, setDerivationPaths] = useState(initialDerivationPaths)

  const [customModalStep, setCustomModalStep] = useState(0)
  const [customPath, setCustomPath] = useState(initialCustomPath)
  const [customPathLabel, setCustomPathLabel] = useState("")

  // Reset value to display placeholder after adding a custom path
  const customPathValue = customPath.isReset
    ? ""
    : `m/44'/${customPath.coinType}'/${customPath.account}'/${customPath.change}`

  const currentPath = derivationPaths[activeIndex]

  const showDropdownHandler = () => setIsDropdownOpen(!isDropdownOpen)
  const hideDropdownHandler = () => setIsDropdownOpen(false)

  const selectContainerRef = useRef(null)

  useOnClickOutside(selectContainerRef, hideDropdownHandler)

  useEffect(() => {
    onChange(currentPath.value)
  }, [currentPath.value, onChange])

  const updateSelectedOption = (index: number) => {
    setActiveIndex(index)
    setIsDropdownOpen(false)
  }

  // TODO Does it make sense to use `useReducer`
  const handleAddCustomPath = () => {
    setCustomModalStep(0)
    updateSelectedOption(derivationPaths.length)

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

  return (
    <>
      <div
        className={classNames("modal", {
          [`open step_${customModalStep}`]: customModalStep > 0,
        })}
      >
        <div className="modal_overlay" />
        <div className="modal_content">
          <button type="button" aria-label="close modal">
            <button
              type="button"
              className="icon_close"
              onClick={() => {
                setCustomModalStep((prev) => prev - 1)
              }}
              aria-label="close modal"
            />
          </button>
          <div className="modal_body">
            <h2 className="modal_header">Add custom derivation path</h2>
            <div className="step_1">
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
                  onFocus={() => setCustomModalStep(2)}
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
            </div>
            <div className="step_2">
              <div className="input_wrap custom">
                <span>m/44&#39;/</span>
                <input
                  name="coinType"
                  className="custom_input"
                  value={customPath.coinType}
                  onChange={handleChangeCustomPath}
                />
                <span>&#39;/</span>
                <input
                  name="account"
                  className="custom_input"
                  value={customPath.account}
                  onChange={handleChangeCustomPath}
                />
                <span>&#39;/</span>
                <input
                  name="change"
                  className="custom_input"
                  value={customPath.change}
                  onChange={handleChangeCustomPath}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={classNames("select", "up", { active: isDropdownOpen })}
        ref={selectContainerRef}
      >
        <label htmlFor="button">Derivation path</label>
        <button
          id="button"
          type="button"
          className="button"
          onClick={showDropdownHandler}
          onKeyPress={showDropdownHandler}
          tabIndex={0}
        >
          <span>
            {currentPath.label} - {currentPath.value}
          </span>
          <span className="icon" />
        </button>
        <ul
          className={classNames("options", {
            show: isDropdownOpen,
            hide: !isDropdownOpen,
          })}
        >
          {derivationPaths.map((option, index) => {
            return (
              <li
                key={option.value}
                role="option"
                tabIndex={index}
                className={classNames("option", {
                  selected: activeIndex === index,
                })}
                aria-selected={activeIndex === index}
                onClick={() => updateSelectedOption(index)}
                onKeyPress={(e) => {
                  if (e.key === "enter") {
                    updateSelectedOption(index)
                  }
                }}
              >
                <div className="option_content">
                  <span>{option.label}</span>
                  <span>{option.value}</span>
                </div>
              </li>
            )
          })}
          <li className="custom_option">
            <button type="button" onClick={() => setCustomModalStep(1)}>
              Add custom path
            </button>
          </li>
        </ul>
      </div>
      <style jsx>
        {`
          .modal {
            position: fixed;
            display: none;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999;
            align-items: center;
            justify-content: center;
          }
          .modal.open {
            display: flex;
          }
          .modal_overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--hunter-green);
            opacity: 0.7;
          }
          .modal_content {
            position: relative;
            display: flex;
            align-items: center;
            z-index: 1;
            box-sizing: border-box;
            width: 312px;
            background-color: var(--green-120);
            padding: 24px;
            box-shadow: 0px 24px 24px rgba(0, 20, 19, 0.14),
              0px 14px 16px rgba(0, 20, 19, 0.24),
              0px 10px 12px rgba(0, 20, 19, 0.34);
            border-radius: 8px;
            min-height: ${customModalStep === 2 ? "463px" : "auto"};
            transition: min-height 0.2s ease-in-out, opacity 0.2s ease-in-out;
          }
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 11px;
            height: 11px;
            padding: 2.5px;
            position: absolute;
            right: 16px;
            top: 16px;
            background-color: var(--green-20);
            z-index: 1;
          }
          .modal_body {
            min-height: 320px;
            flex: 1;
          }
          .step_1 {
            display: ${customModalStep === 1 ? "block" : "none"};
          }
          .step_2 {
            display: ${customModalStep === 2 ? "block" : "none"};
          }
          .modal_header {
            color: var(--green-20);
            font-size: 18px;
            line-height: 24px;
            margin-bottom: 24px;
          }
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
          .select {
            box-sizing: border-box;
            display: inline-block;
            position: relative;
            width: 320px;
            background-color: transparent;
          }

          label {
            color: var(--green-40);
            font-size: 12px;
          }

          .button {
            position: relative;
            z-index: 1;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 16px;
            cursor: pointer;
            width: 100%;
            height: 40px;
            color: var(--green-20);
            border-width: 2;
            border-color: var(--green-60);
            border-style: solid;
            border-radius: 5px;
            transition: background-color 0.2s ease-in-out;
          }

          .button .icon {
            mask-image: url("./images/chevron_down.svg");
            mask-size: 15px 8px;
            width: 15px;
            height: 8px;
            background-color: var(--green-60);
            transition: transform 0.2s ease-in-out;
          }

          .select .icon {
            transform: rotate(180deg);
          }

          .select.active .icon {
            transform: rotate(0);
            background-color: var(--hunter-green);
          }

          .select.active .button {
            background-color: var(--trophy-gold);
            border-color: var(--trophy-gold);
            color: var(--hunter-green);
            font-weight: 600;
          }

          .options {
            position: absolute;
            left: 2px;
            box-sizing: border-box;
            width: 316px;
            bottom: 0px;
            text-align: right;
            background-color: var(--green-95);
            border-radius: 5px;
            overflow-y: auto;
            color: var(--green-60);
            box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
              0px 6px 8px rgba(0, 20, 19, 0.24),
              0px 2px 4px rgba(0, 20, 19, 0.34);
            max-height: 0;
            opacity: 0;
            line-height: 1.5;
            transition: max-height 0.2s ease-in-out, opacity 0.2s ease-in-out;
          }

          .options.show {
            max-height: 224px;
            bottom: 42px;
            opacity: 1;
          }

          .option {
            display: flex;
            align-items: center;
            box-sizing: border-box;
            list-style-type: none;
            font-weight: 600;
            cursor: pointer;
            padding: 0 16px;
            color: var(--green-20);
          }

          .option.selected {
            color: var(--green-60);
          }

          .option:hover:not(.selected) {
            color: var(--green-40);
          }

          .option_content {
            display: flex;
            justify-content: space-between;
            padding-top: 16px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--green-80);
            width: 100%;
          }

          .custom_option {
            color: var(--trophy-gold);
            font-weight: 600;
            padding: 16px;
            display: flex;
            justify-content: flex-end;
            background-color: var(--green-95);
          }
        `}
      </style>
    </>
  )
}
