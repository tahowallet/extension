import React, { ReactElement, useState, useEffect } from "react"
import classNames from "classnames"
import { Redirect } from "react-router-dom"
import { History } from "history"
import SharedLoadingSpinner from "./SharedLoadingSpinner"
import { PropsWithIcon } from "./types"

export type Props = {
  children: React.ReactNode
  id?: string
  type:
    | "primary"
    | "primaryGreen"
    | "secondary"
    | "tertiary"
    | "tertiaryWhite"
    | "tertiaryGray"
    | "tertiaryError"
    | "deemphasizedWhite"
    | "warning"
    | "unstyled"
    | "twitter"
  size: "small" | "medium" | "large"
  /**
   * Default: right
   */
  iconPosition?: "left" | "right"
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  isDisabled?: boolean
  hideEvents?: boolean
  linkTo?: History.LocationDescriptor<unknown>
  showLoadingOnClick?: boolean
  isLoading?: boolean
  isFormSubmit?: boolean
  center?: boolean
  style?: React.CSSProperties
}

export default function SharedButton(
  props: Props & PropsWithIcon,
): ReactElement {
  const {
    id,
    children,
    type,
    size,
    onClick,
    isDisabled = false,
    hideEvents = true,
    iconSmall,
    iconMedium,
    iconPosition = "right",
    linkTo = null,
    showLoadingOnClick = false,
    isLoading = false,
    isFormSubmit = false,
    style,
    center = false,
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
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) {
    setIsClicked(true)
    onClick?.(e)
    if (linkTo) {
      setNavigateTo(linkTo)
    }
  }

  const isShowingLoadingSpinner = isLoading || (isClicked && showLoadingOnClick)
  const spinnerVariant = type === "secondary" ? "dark-green" : "hunter-green"

  return (
    <button
      id={id}
      type={isFormSubmit ? "submit" : "button"}
      className={classNames(
        type !== "unstyled" && "button",
        { large: size === "large" },
        { small: size === "small" },
        { secondary: type === "secondary" },
        { primaryGreen: type === "primaryGreen" },
        { disabled: isDisabled },
        { hidden_events: isDisabled && hideEvents },
        { tertiary: type === "tertiary" },
        { "tertiary white": type === "tertiaryWhite" },
        { "tertiary gray": type === "tertiaryGray" },
        { "tertiary error": type === "tertiaryError" },
        { deemphasized_white: type === "deemphasizedWhite" },
        { warning: type === "warning" },
        { twitter: type === "twitter" },
        { center },
      )}
      onClick={handleClick}
      style={style}
    >
      {isShowingLoadingSpinner && (
        <div className="spinner_wrap">
          <SharedLoadingSpinner
            variant={isDisabled ? "transparent" : spinnerVariant}
          />
        </div>
      )}
      <div
        className={classNames("button_content", {
          hide_me: isShowingLoadingSpinner,
          icon_left: iconPosition === "left",
        })}
      >
        {children}
        {iconMedium || iconSmall || type === "twitter" ? (
          <span
            className={classNames(
              { icon_button: true },
              { icon_medium: iconMedium },
            )}
          />
        ) : null}
      </div>

      <style jsx>
        {`
          .button {
            height: 40px;
            border-radius: 4px;
            background-color: var(--trophy-gold);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: var(--hunter-green);
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.48px;
            line-height: 24px;
            text-align: center;
            padding: 0 17px;
            transition:
              background-color 0.2s,
              color 0.2s;
          }
          .button:hover {
            background-color: var(--gold-80);
            color: var(--green-95);
          }
          .button:hover .icon_button {
            background-color: var(--green-95);
          }
          .button:active {
            background-color: var(--trophy-gold);
            color: var(--green-120);
          }
          .button:active .icon_button {
            background-color: var(--green-120);
          }
          .button_content {
            display: flex;
            align-items: center;
          }
          .center .button_content {
            justify-content: center;
            width: 100%;
          }
          .icon_button {
            mask-image: url("./images/icons/s/${iconSmall}.svg");
            mask-size: cover;
            width: 16px;
            height: 16px;
            margin-left: 9px;
            background-color: var(--hunter-green);
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
          .icon_medium {
            mask-image: url("./images/icons/m/${iconMedium}.svg");
            mask-size: cover;
            width: 24px;
            height: 24px;
            margin-left: 10px;
          }
          .secondary {
            background-color: transparent;
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
          .primaryGreen {
            color: var(--hunter-green);
            background-color: var(--trophy-gold);
          }
          .disabled {
            background-color: var(--green-60);
            border-color: var(--green-60);
            color: var(--green-80);
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
          .hidden_events {
            pointer-events: none;
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
          .twitter {
            background-color: #3a90e9;
            color: #fff;
          }
          .twitter:hover {
            color: #fff;
            background-color: #5cacff;
          }
          .twitter .icon_button,
          .twitter:hover .icon_button {
            mask-image: url("./images/twitter.svg");
            background-color: #fff;
          }
          .white {
            color: #ffffff;
            font-weight: 500;
          }
          .white .icon_button {
            background-color: #ffffff;
          }
          .gray {
            color: var(--green-20);
          }
          .gray .icon_button {
            background-color: var(--green-20);
          }
          .gray:hover {
            color: var(--green-20);
          }
          .gray:hover .icon_button {
            background-color: var(--green-20);
          }
          .error {
            color: var(--error);
          }
          .error .icon_button {
            background-color: var(--error);
          }
          .error:hover {
            color: var(--error-80);
          }
          .error:hover .icon_button {
            background-color: var(--error-80);
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
          .unstyled {
            unset: all;
          }
          .spinner_wrap {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
          }
        `}
      </style>
    </button>
  )
}
