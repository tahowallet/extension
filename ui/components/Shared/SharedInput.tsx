import React, { ChangeEvent, ReactElement, useEffect, useRef } from "react"
import classNames from "classnames"
import { useParsedValidation, useRunOnFirstRender } from "../../hooks"

interface Props<T> {
  id?: string
  label?: string
  maxLength?: number
  focusedLabelBackgroundColor: string
  placeholder?: string
  type: "password" | "text" | "number"
  value?: string | undefined
  onChange?: (value: T | undefined) => void
  onFocus?: () => void
  errorMessage?: string
  warningMessage?: string
  autoFocus?: boolean
  autoSelect?: boolean
  parseAndValidate: (
    value: string
  ) => { parsed: T | undefined } | { error: string }
  step?: number
  isEmpty?: boolean
  isSmall?: boolean
}

export function SharedTypedInput<T = string>(props: Props<T>): ReactElement {
  const {
    id,
    label,
    placeholder,
    maxLength,
    focusedLabelBackgroundColor,
    type,
    onChange,
    onFocus,
    value: currentValue,
    errorMessage,
    warningMessage,
    step = undefined,
    autoFocus = false,
    autoSelect = false,
    parseAndValidate,
    isEmpty = false,
    isSmall = false,
  } = props
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (autoSelect) inputRef.current?.select()
  }, [autoSelect])

  const {
    rawValue: inputValue,
    errorMessage: parserError,
    handleInputChange,
  } = useParsedValidation<T | undefined>(
    onChange ?? (() => {}),
    parseAndValidate
  )

  useRunOnFirstRender(() => {
    if (currentValue && currentValue.trim() !== inputValue) {
      handleInputChange(currentValue)
    }
  })

  return (
    <>
      <input
        id={id}
        type={type}
        placeholder={
          typeof placeholder === "undefined" || placeholder === ""
            ? " "
            : placeholder
        }
        value={isEmpty ? "" : inputValue}
        spellCheck={false}
        onInput={(event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event.target.value)
        }
        onFocus={onFocus}
        className={classNames({
          error: !isEmpty && (errorMessage ?? parserError !== undefined),
          small: isSmall,
        })}
        step={step}
        ref={inputRef}
        maxLength={maxLength}
      />
      <label htmlFor={id}>{label}</label>
      {!isEmpty && errorMessage && (
        <div className="validation_message">{errorMessage}</div>
      )}
      {!isEmpty && warningMessage && (
        <div className="validation_message warning">{warningMessage}</div>
      )}
      {!isEmpty && parserError && (
        <div className="validation_message">{parserError}</div>
      )}
      <style jsx>
        {`
          input {
            width: 100%;
            height: 48px;
            border-radius: 4px;
            border: 2px solid var(--green-60);
            padding: 0px 16px;
            box-sizing: border-box;
          }
          input::placeholder {
            color: var(--green-40);
          }
          input:focus {
            border: 2px solid var(--green-40);
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          .error {
            border-color: var(--error);
          }
          .validation_message {
            color: var(--error);
            position: absolute;
            font-weight: 500;
            font-size: 14px;
            line-height: 20px;
            margin-top: 3px;
            margin-left: 5px;
          }
          .warning {
            color: var(--trophy-gold);
          }
          label {
            position: absolute;
            pointer-events: none;
            display: flex;
            width: fit-content;
            margin-left: 16px;
            transform: translateY(-32px);
            background-color: ${focusedLabelBackgroundColor};
            border-radius: 5px;
            box-sizing: border-box;
            color: var(--green-40);
            transition: font-size 0.2s ease, transform 0.2s ease,
              font-weight 0.2s ease, padding 0.2s ease;
          }
          input:disabled {
            color: var(--green-40);
            background-color: var(--green-80);
          }
          input:disabled ~ label {
            color: var(--green-60);
          }
          input:focus {
            border-color: var(--trophy-gold);
          }
          input:focus ~ label {
            color: var(--trophy-gold);
          }
          input:focus ~ label,
          input:not(:placeholder-shown) ~ label,
          input:not([placeholder=" "]) ~ label {
            transform: translateY(-57px) translateX(-5px);
            font-size: 12px;
            font-weight: 500;
            padding: 0px 6px;
          }
          .error ~ label,
          input.error:focus ~ label {
            color: var(--error);
          }
          .small {
            width: 48px;
            height: 32px;
            padding: 6px;
            box-sizing: border-box;
            border-width: 1px;
            text-align: right;
          }
          .small::-webkit-outer-spin-button,
          .small::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        `}
      </style>
    </>
  )
}

SharedTypedInput.defaultProps = {
  type: "text",
  focusedLabelBackgroundColor: "var(--hunter-green)",
}

export default function SharedInput(
  props: Omit<Props<string>, "onChange"> & { onChange?: (_: string) => void }
): ReactElement {
  const onChangeWrapper = (newValue: string | undefined) => {
    props.onChange?.(newValue ?? "")
  }

  return SharedTypedInput({
    ...props,
    onChange: onChangeWrapper,
  })
}

SharedInput.defaultProps = {
  ...SharedTypedInput.defaultProps,
  parseAndValidate: (v: string) => ({ parsed: v }),
}
