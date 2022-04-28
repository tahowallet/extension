import React, { ChangeEvent, ReactElement, useEffect, useRef } from "react"
import classNames from "classnames"
import { useParsedValidation, useRunOnFirstRender } from "../../hooks"

interface Props<T> {
  id?: string
  label: string
  focusedLabelBackgroundColor: string
  placeholder?: string
  type: "password" | "text" | "number"
  value?: string | undefined
  onChange?: (value: T | undefined) => void
  onFocus?: () => void
  errorMessage?: string
  autoFocus?: boolean
  autoSelect?: boolean
  parseAndValidate: (
    value: string
  ) => { parsed: T | undefined } | { error: string }
}

export function SharedTypedInput<T = string>(props: Props<T>): ReactElement {
  const {
    id,
    label,
    placeholder,
    focusedLabelBackgroundColor,
    type,
    onChange,
    onFocus,
    value: currentValue,
    errorMessage,
    autoFocus = false,
    autoSelect = false,
    parseAndValidate,
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
        value={inputValue}
        spellCheck={false}
        onInput={(event: ChangeEvent<HTMLInputElement>) =>
          handleInputChange(event.target.value)
        }
        onFocus={onFocus}
        className={classNames({
          error: errorMessage,
        })}
        ref={inputRef}
      />
      <label htmlFor={id}>{label}</label>
      {errorMessage && <div className="error_message">{errorMessage}</div>}
      {parserError && <div className="error_message">{parserError}</div>}
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
          .error,
          .error:focus {
            border-color: var(--error);
          }
          .error_message {
            color: var(--error);
            position: absolute;
            font-weight: 500;
            font-size: 14px;
            line-height: 20px;
            margin-top: 3px;
            margin-left: 5px;
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
