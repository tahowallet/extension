import React, {
  ChangeEvent,
  ReactElement,
  useEffect,
  useReducer,
  useRef,
} from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import { useParsedValidation, useRunOnFirstRender } from "../../hooks"
import { PropsWithIcon } from "./types"

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

export function SharedTypedInput<T = string>(
  props: Props<T> & PropsWithIcon
): ReactElement {
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
    iconMedium,
    iconSmall,
  } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { t } = useTranslation("translation", { keyPrefix: "shared" })

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

  const [showPassword, toggleShowPassword] = useReducer(
    (visible) => !visible,
    false
  )

  useRunOnFirstRender(() => {
    if (currentValue && currentValue.trim() !== inputValue) {
      handleInputChange(currentValue)
    }
  })

  const passwordInputType = showPassword ? "text" : "password"
  return (
    <>
      <div className="icon_wrapper">
        <input
          id={id}
          type={type === "password" ? passwordInputType : type}
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
            password: type === "password",
          })}
          step={step}
          ref={inputRef}
          maxLength={maxLength}
        />
        {(iconMedium || iconSmall) &&
          (type === "password" ? (
            <button
              role="switch"
              type="button"
              aria-label={
                !showPassword ? t("showPasswordHint") : t("hidePasswordHint")
              }
              aria-checked={showPassword}
              onClick={toggleShowPassword}
              className={classNames("icon", {
                icon_medium: iconMedium,
                active: showPassword,
              })}
            />
          ) : (
            <i
              role="presentation"
              className={classNames("icon", { icon_medium: iconMedium })}
            />
          ))}
        <label htmlFor={id}>{label}</label>
      </div>
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
          input.password {
            padding-right: 40px;
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
          .icon_wrapper {
            position: relative;
          }
          .icon {
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            margin-right: 16px;
            height: 16px;
            width: 16px;
            mask-image: url("./images/icons/s/${iconSmall}.svg");
            mask-size: cover;
            background-position: center;
            background-color: var(--green-60);
            background-size: 16px;
            transition: all 0.12s ease-out;
            transform: translateY(50%);
          }
          .icon.active {
            background-color: var(--trophy-gold);
          }
          .icon_medium {
            mask-image: url("./images/icons/m/${iconMedium}.svg");
            mask-size: cover;
            width: 24px;
            height: 24px;
            background-size: 24px;
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
  props: Omit<Props<string>, "onChange"> & {
    onChange?: (_: string) => void
  } & PropsWithIcon
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
