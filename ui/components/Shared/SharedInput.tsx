import React, {
  ChangeEventHandler,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react"
import classNames from "classnames"
import { useRunOnFirstRender } from "../../hooks"

interface Props<T> {
  id?: string
  label: string
  focusedLabelBackgroundColor: string
  defaultValue?: T
  placeholder?: string
  type: "password" | "text" | "number"
  value?: string | number | undefined
  onChange?: (value: T) => void
  onFocus?: () => void
  errorMessage?: string
  autoFocus?: boolean
  autoSelect?: boolean
  parseAndValidate?: (
    value: string
  ) => { state: "error"; message: string } | { state: "parsed"; parsed: T }
}

export default function SharedInput<T = string>(props: Props<T>): ReactElement {
  const {
    id,
    label,
    defaultValue,
    placeholder,
    focusedLabelBackgroundColor,
    type,
    onChange,
    onFocus,
    value,
    errorMessage,
    autoFocus = false,
    autoSelect = false,
    parseAndValidate,
  } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [parserError, setParserError] = useState<string | null>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (autoSelect) inputRef.current?.select()
  }, [autoSelect])

  useRunOnFirstRender(() => {
    if (defaultValue) {
      onChange?.(defaultValue)
    }
  })

  const onInputChange: ChangeEventHandler<HTMLInputElement> = ({
    target: { value: inputValue },
  }) => {
    if (parseAndValidate) {
      const result = parseAndValidate(inputValue)
      if (result.state === "error") {
        setParserError(result.message)
      } else {
        setParserError(null)
        onChange?.(result.parsed)
      }
    } else {
      onChange?.(value as unknown as T)
    }
  }

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
        value={value}
        spellCheck={false}
        onChange={onInputChange}
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
          input:focus ~ label,
          input:not(:placeholder-shown) ~ label,
          input:not([placeholder=" "]) ~ label {
            transform: translateY(-57px) translateX(-5px);
            font-size: 12px;
            font-weight: 500;
            padding: 0px 6px;
          }
          .error ~ label {
            color: var(--error);
          }
        `}
      </style>
    </>
  )
}

SharedInput.defaultProps = {
  type: "text",
  focusedLabelBackgroundColor: "var(--hunter-green)",
}
