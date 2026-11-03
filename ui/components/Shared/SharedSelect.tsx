import React, {
  useState,
  useRef,
  ReactElement,
  useEffect,
  useMemo,
} from "react"
import classNames from "classnames"

import { useOnClickOutside } from "../../hooks"

export type Option = { value: string; label: string; hideActiveValue?: boolean }

type Props = {
  options: Option[] | string[]
  onChange: (value: string) => void
  defaultIndex?: number
  label?: string
  placement?: "top" | "bottom"
  triggerLabel?: string
  onTrigger?: () => void
  showValue?: boolean
  showOptionValue?: boolean
  width?: string | number
  /**
   * The size of the select, `default` if unset. Compact selects suit short
   * values set in a row, such as those on the settings page: they use tighter
   * option rows with left-aligned labels, and their option list is sized to
   * show four options at a time.
   */
  size?: "default" | "compact"
}

export default function SharedSelect(props: Props): ReactElement {
  const {
    options: initialOptions,
    onChange,
    defaultIndex = 0,
    label,
    placement = "bottom",
    triggerLabel,
    onTrigger,
    showValue,
    showOptionValue,
    width = "320px",
    size = "default",
  } = props

  const cssWidth = typeof width === "number" ? `${width}px` : width

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(defaultIndex)
  const previousdefaultIndex = useRef(defaultIndex)

  const showDropdownHandler = () => setIsDropdownOpen(!isDropdownOpen)
  const hideDropdownHandler = () => setIsDropdownOpen(false)

  const selectContainerRef = useRef<HTMLDivElement | null>(null)
  useOnClickOutside(selectContainerRef, hideDropdownHandler)

  const options = useMemo(
    () =>
      initialOptions.map((option) =>
        typeof option !== "string"
          ? option
          : {
              value: option,
              label: option,
            },
      ),
    [initialOptions],
  )

  const currentOption =
    activeIndex !== null && activeIndex !== undefined
      ? options[activeIndex]
      : null
  const currentLabel = currentOption?.label ?? null
  const currentValue = currentOption?.value ?? null
  const currentHideActiveValue = currentOption?.hideActiveValue ?? false

  useEffect(() => {
    if (currentValue) onChange(currentValue)
  }, [currentValue, onChange])

  useEffect(() => {
    if (previousdefaultIndex.current !== defaultIndex)
      setActiveIndex(defaultIndex)
  }, [defaultIndex])

  const updateSelectedOption = (index: number) => {
    setActiveIndex(index)
    setIsDropdownOpen(false)
  }

  return (
    <>
      <div
        className={classNames("select", [placement], {
          active: isDropdownOpen,
          compact: size === "compact",
        })}
        ref={selectContainerRef}
      >
        {label && <label htmlFor="button">{label}</label>}
        <button
          id="button"
          type="button"
          className="button"
          onClick={showDropdownHandler}
          onKeyPress={showDropdownHandler}
          tabIndex={0}
        >
          <span>
            {showValue && activeIndex && !currentHideActiveValue
              ? `${currentLabel} - ${currentValue}`
              : `${currentLabel}`}
          </span>
          <span className="icon" />
        </button>
        <ul
          className={classNames("options", {
            show: isDropdownOpen,
            hide: !isDropdownOpen,
          })}
        >
          {options.map((option, index) => (
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
                {showOptionValue && <span>{option.value}</span>}
              </div>
            </li>
          ))}
          {triggerLabel && (
            <li className="custom_option">
              <button type="button" onClick={onTrigger}>
                {triggerLabel}
              </button>
            </li>
          )}
        </ul>
      </div>
      <style jsx>
        {`
          .select {
            box-sizing: border-box;
            display: inline-block;
            position: relative;
            width: ${cssWidth};
            background-color: transparent;
          }

          label {
            color: var(--green-40);
            font-size: 12px;
            display: block;
            margin-bottom: 4px;
            margin-top: 0;
            line-height: 16px;
          }

          .button {
            position: relative;
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
            transition:
              background-color var(--fade),
              border-color var(--fade),
              color var(--fade);
          }

          .button .icon {
            mask-image: url("./images/chevron_down.svg");
            mask-size: 15px 8px;
            width: 15px;
            height: 8px;
            background-color: var(--green-60);
            transition:
              transform 0.2s ease-in-out,
              background-color var(--fade);
          }

          .select.top .icon,
          .select.active.bottom .icon {
            transform: rotate(180deg);
          }

          .select.bottom .icon,
          .select.active.top .icon {
            transform: rotate(0);
          }

          .select.active .icon {
            background-color: var(--on-accent);
          }

          .select.active .button {
            background-color: var(--trophy-gold);
            border-color: var(--trophy-gold);
            color: var(--on-accent);
            font-weight: 600;
          }

          .options {
            position: absolute;
            left: 2px;
            box-sizing: border-box;
            width: calc(${cssWidth} - 4px);
            text-align: right;
            background-color: var(--green-95);
            border-radius: 5px;
            overflow-y: auto;
            color: var(--green-60);
            box-shadow: var(--shadow-menu);
            max-height: 0;
            height: fit-content;
            opacity: 0;
            line-height: 1.5;
            transition:
              max-height 0.2s ease-in-out,
              opacity 0.2s ease-in-out;
            z-index: var(--z-dropdown);
          }

          .select.bottom .options {
            top: 42px;
          }

          .select.top .options {
            bottom: 42px;
          }

          .options.show {
            max-height: 140px;
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
            transition: color var(--fade);
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
            width: 100%;
          }

          .option:not(:last-child) .option_content {
            border-bottom: 1px solid var(--green-80);
          }

          /* Compact selects follow the auto-lock timer select in the
             "UI - Dark" Figma file. */
          .compact .button {
            gap: 8px;
            padding: 0 12px 0 14px;
            white-space: nowrap;
          }
          .compact .options {
            text-align: left;
          }
          .compact.bottom .options {
            top: 45px;
          }
          .compact.top .options {
            bottom: 45px;
          }
          /* Fits four 40px option rows and their dividers. */
          .compact .options.show {
            max-height: 164px;
          }
          .compact .option {
            padding: 0 5px;
          }
          .compact .option_content {
            padding: 8px 9.5px;
          }
          /* Compact lists mark the current value by brightening it. */
          .compact .option {
            color: var(--green-40);
          }
          .compact .option.selected,
          .compact .option:hover:not(.selected) {
            color: var(--green-5);
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
