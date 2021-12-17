import classNames from "classnames"
import React, { useState, useRef, ReactElement } from "react"
import { useOnClickOutside } from "../../hooks"

type Option = { value: string; label: string }

type Props = {
  options: Option[] | string[]
  onChange: (value: string) => void
  placeholder?: string
  placement?: "top" | "bottom"
}

export default function SharedSelect(props: Props): ReactElement {
  const { options, placeholder, onChange, placement = "bottom" } = props
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>()

  const label =
    activeIndex != null
      ? (options[activeIndex] as Option)?.label ?? options[activeIndex]
      : placeholder

  const showDropdownHandler = () => setShowDropdown(!showDropdown)
  const hideDropdownHandler = () => setShowDropdown(false)

  const selectContainerRef = useRef(null)

  useOnClickOutside(selectContainerRef, hideDropdownHandler)

  const updateSelectedOption = (value: string, index: number) => {
    setActiveIndex(index)
    onChange(value)
    setShowDropdown(false)
  }

  return (
    <div
      className={classNames("select", [placement], { active: showDropdown })}
      ref={selectContainerRef}
    >
      <button
        type="button"
        className="button"
        onClick={showDropdownHandler}
        onKeyPress={showDropdownHandler}
        tabIndex={0}
      >
        <span>{label ?? placeholder}</span>
        <span className="icon" />
      </button>
      <ul
        className={classNames("options", {
          show: showDropdown,
          hide: !showDropdown,
        })}
      >
        {options.map((option, index) => {
          const [optionValue, optionLabel] =
            typeof option === "string"
              ? [option, option]
              : [option.value, option.label]

          return (
            <li
              key={optionValue}
              role="menuitem"
              tabIndex={index}
              className={classNames("option", {
                selected: activeIndex === index,
              })}
              onClick={() => updateSelectedOption(optionValue, index)}
              onKeyDown={() => updateSelectedOption(optionValue, index)}
            >
              {optionLabel}
            </li>
          )
        })}
      </ul>
      <style jsx>
        {`
          .select {
            box-sizing: border-box;
            display: inline-block;
            position: relative;
            width: 332px;
            background-color: transparent;
            border-width: 2;
            border-color: var(--green-60);
            border-style: solid;
            border-radius: 5px;
          }

          .button {
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            cursor: pointer;
            width: 100%;
            color: var(--green-60);
          }

          .button .icon {
            mask-image: url("./images/chevron_down.svg");
            mask-size: 15px 8px;
            width: 15px;
            height: 8px;
            background-color: var(--green-60);
            transition: transform 0.1s ease-in-out;
          }

          .select.top .icon,
          .select.active.bottom .icon {
            transform: rotate(180deg);
          }

          .select.active.top .icon {
            transform: rotate(0);
          }

          .options {
            box-sizing: border-box;
            width: 332px;
            position: absolute;
            left: -2px;
            margin: 0;
            padding: 0;
            text-align: center;
            background-color: var(--hunter-green);
            border: 2px solid var(--green-60);
            border-radius: 5px;
            max-height: 190px;
            overflow-y: auto;
            color: var(--green-60);
          }

          .select.top .options {
            bottom: 50px;
          }

          .select.bottom .options {
            top: 50px;
          }

          .options.show {
            min-height: 50px;
            opacity: 1;
            visibility: visible;
          }

          .options.hide {
            min-height: 0;
            opacity: 0;
            visibility: hidden;
          }

          .option {
            box-sizing: border-box;
            display: flex;
            align-items: center;
            list-style-type: none;
            padding: 12px 16px;
            cursor: pointer;
          }

          .option.selected {
            background-color: var(--green-95);
          }

          .option:hover {
            background-color: var(--trophy-gold);
            color: white;
          }
        `}
      </style>
    </div>
  )
}
