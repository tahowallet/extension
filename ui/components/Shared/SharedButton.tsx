import React, { ReactElement, useState, useEffect } from "react"
import classNames from "classnames"
import { Redirect } from "react-router-dom"
import { History } from "history"
import SharedLoadingSpinner from "./SharedLoadingSpinner"

interface Props {
  children: React.ReactNode
  type:
    | "primary"
    | "secondary"
    | "tertiary"
    | "tertiaryWhite"
    | "tertiaryGray"
    | "deemphasizedWhite"
    | "warning"
  size: "small" | "medium" | "large"
  icon?: string
  iconSize?: "small" | "medium" | "large" | "secondaryMedium"
  iconPosition?: "left" | "right"
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  isDisabled?: boolean
  linkTo?: History.LocationDescriptor<unknown>
  showLoadingOnClick: boolean
  isFormSubmit: boolean
}

export default function SharedButton(props: Props): ReactElement {
  const {
    children,
    type,
    size,
    onClick,
    isDisabled,
    icon,
    iconSize,
    iconPosition,
    linkTo,
    showLoadingOnClick,
    isFormSubmit,
  } = props

  const [navigateTo, setNavigateTo] =
    React.useState<History.LocationDescriptor<unknown> | null>(null)
  const [isClicked, setIsClicked] = useState(false)

  // If the prop deciding if the loader should be displayed or not
  // changes, assume resetting the loading state condition.
  useEffect(() => {
    setIsClicked(false)
  }, [showLoadingOnClick])

  if (navigateTo && navigateTo === linkTo) {
    return <Redirect push to={linkTo} />
  }

  async function handleClick(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    setIsClicked(true)
    onClick?.(e)
    if (linkTo) {
      setNavigateTo(linkTo)
    }
  }

  const isShowingLoadingSpinner = isClicked && showLoadingOnClick

  return (
    <button
      type={isFormSubmit ? "submit" : "button"}
      className={classNames(
        { large: size === "large" },
        { small: size === "small" },
        { secondary: type === "secondary" },
        { disabled: isDisabled },
        { tertiary: type === "tertiary" },
        { "tertiary white": type === "tertiaryWhite" },
        { "tertiary gray": type === "tertiaryGray" },
        { deemphasized_white: type === "deemphasizedWhite" },
        { warning: type === "warning" }
      )}
      onClick={handleClick}
    >
      {isShowingLoadingSpinner && (
        <div className="spinner_wrap">
          <SharedLoadingSpinner />
        </div>
      )}
      <div
        className={classNames("button_content", {
          hide_me: isShowingLoadingSpinner,
          icon_left: iconPosition === "left",
        })}
      >
        {children}
        {icon ? (
          <span
            className={classNames(
              { icon_button: true },
              { icon_large: iconSize === "large" },
              { icon_secondary_medium: iconSize === "secondaryMedium" }
            )}
          />
        ) : null}
      </div>

      <style jsx>
        {`
          button {
            height: 40px;
            border-radius: 4px;
            background-color: var(--trophy-gold);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.48px;
            line-height: 24px;
            text-align: center;
            padding: 0 17px;
          }
          button:hover {
            background-color: var(--gold-80);
            color: var(--green-95);
          }
          button:hover .icon_button {
            background-color: var(--green-95);
          }
          button:active {
            background-color: var(--trophy-gold);
            color: var(--green-120);
          }
          button:active .icon_button {
            background-color: var(--green-120);
          }
          .button_content {
            display: flex;
            align-items: center;
          }
          .icon_button {
            mask-image: url("./images/${icon}@2x.png");
            mask-size: cover;
            width: 12px;
            height: 12px;
            margin-left: 9px;
            background-color: #ffffff;
            display: inline-block;
            margin-top: -1px;
          }
          .large {
            height: 48px;
            border-radius: 8px;
            padding: 0 24px;
          }
          .icon_secondary_medium {
            width: 16px;
            height: 16px;
            margin-left: 4px;
          }
          .icon_large {
            width: 24px;
            height: 24px;
            margin-left: 10px;
          }
          .secondary {
            background: unset;
            border: 2px solid var(--trophy-gold);
            color: var(--trophy-gold);
            box-sizing: border-box;
          }
          .secondary .icon_button {
            background-color: var(--trophy-gold);
          }
          .secondary:hover {
            border-color: var(--gold-80);
          }
          .secondary:active {
            border-color: var(--trophy-gold);
          }
          .disabled {
            background-color: var(--green-60);
            color: var(--green-80);
            pointer-events: none;
          }
          .disabled .icon_button {
            background-color: var(--green-80);
          }
          .disabled:hover {
            background-color: var(--green-60);
            color: var(--green-80);
          }
          .disabled:hover .icon_button {
            background-color: var(--green-80);
          }
          .disabled:active {
            background-color: var(--green-60);
            color: var(--green-80);
          }
          .disabled:active .icon_button {
            background-color: var(--green-80);
          }
          .tertiary {
            color: var(--trophy-gold);
            background: unset;
            border: unset;
            padding: unset;
            font-size: 18px;
          }
          .tertiary .icon_button {
            background-color: var(--trophy-gold);
          }
          .tertiary:hover {
            background-color: unset;
            color: var(--gold-40);
          }
          .tertiary:hover .icon_button {
            background-color: var(--gold-40);
          }
          .tertiary:active {
            background-color: unset;
            color: var(--gold-80);
          }
          .tertiary:active .icon_button {
            background-color: var(--gold-80);
          }
          .white {
            color: #ffffff;
            font-weight: 500;
          }
          .white .icon_button {
            background-color: #ffffff;
          }
          .gray {
            color: var(--green-60);
          }
          .gray .icon_button {
            background-color: var(--green-60);
          }
          .gray:hover {
            color: var(--green-40);
          }
          .gray:hover .icon_button {
            background-color: var(--green-40);
          }
          .tertiary.disabled {
            color: var(--green-60);
          }
          .tertiary.disabled .icon_button {
            background-color: var(--green-60);
          }
          .deemphasized_white {
            color: #fff;
            background-color: var(--green-95);
          }
          .deemphasized_white .icon_button {
            background-color: #fff;
          }
          .deemphasized_white:hover {
            background-color: var(--green-60);
            color: #fff;
          }
          .deemphasized_white:hover .icon_button {
            background-color: #fff;
          }
          .small {
            padding: 0 12px;
            height: 32px;
            font-size: 16px;
          }
          .warning {
            background-color: var(--attention);
          }
          .warning {
            color: var(--hunter-green);
          }
          .warning .icon_button {
            background-color: var(--hunter-green);
          }
          .icon_left {
            flex-direction: row-reverse;
          }
          .icon_left .icon_button {
            margin-left: 0px;
            margin-right: 9px;
          }
          .hide_me {
            opacity: 0;
            position: absolute;
          }
        `}
      </style>
    </button>
  )
}

SharedButton.defaultProps = {
  icon: null,
  isDisabled: false,
  iconSize: "medium",
  iconPosition: "right",
  linkTo: null,
  showLoadingOnClick: false,
  isFormSubmit: false,
}
