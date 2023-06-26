import React, { ReactElement, CSSProperties, useRef } from "react"
import classNames from "classnames"
import { useDelayContentChange, useOnClickOutside } from "../../hooks"
import SharedIcon from "./SharedIcon"

export type SharedSlideUpMenuSize =
  | "auto"
  | "small"
  | "medium"
  | "large"
  | "custom"

type CloseBtnType = "default" | "circle"

const SLIDE_TRANSITION_MS = 445

type Props = {
  isOpen: boolean
  close: (
    e: MouseEvent | TouchEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void
  header?: string
  children: React.ReactNode
  customSize?: string
  size: SharedSlideUpMenuSize
  isFullScreen?: boolean
  isScrollable?: boolean
  isDark?: boolean
  alwaysRenderChildren?: boolean
  testid?: string
  closeBtnType?: CloseBtnType
  customStyles?: React.CSSProperties & Record<string, string>
}

const menuHeights: Record<SharedSlideUpMenuSize, string | null> = {
  auto: "auto",
  small: "268px",
  medium: "536px",
  large: "600px",
  custom: null,
}
export default function SharedSlideUpMenu(props: Props): ReactElement {
  const {
    isOpen,
    close,
    size,
    header,
    children,
    customSize,
    isFullScreen,
    isDark,
    isScrollable,
    alwaysRenderChildren,
    testid = "slide_up_menu",
    closeBtnType = "default",
    customStyles = {},
  } = props

  const slideUpMenuRef = useRef(null)

  useOnClickOutside(slideUpMenuRef, close)

  // Continue showing children during the close transition.
  const visibleChildren = isOpen || alwaysRenderChildren ? children : <></>
  const displayChildren = useDelayContentChange(
    visibleChildren,
    !isOpen,
    SLIDE_TRANSITION_MS
  )

  const menuHeight = menuHeights[size] ?? customSize ?? menuHeights.medium

  return (
    <>
      <div className={classNames("overlay", { closed: !isOpen })} />
      <div
        className={classNames("slide_up_menu", {
          dark: isDark,
          closed: !isOpen,
        })}
        data-testid={testid}
        style={
          { "--menu-height": menuHeight, ...customStyles } as CSSProperties
        }
        ref={isOpen ? slideUpMenuRef : null}
      >
        <div className={header ? "slide_up_header" : "slide_up_close"}>
          {header && <h3>{header}</h3>}
          <div
            className={classNames({
              circle_close: closeBtnType === "circle",
            })}
          >
            <SharedIcon
              icon="close.svg"
              width={12}
              color="var(--green-20)"
              hoverColor="#fff"
              ariaLabel="Close menu"
              onClick={(e) => {
                close(e)
              }}
            />
          </div>
        </div>
        {displayChildren}
      </div>
      <style jsx>
        {`
          .slide_up_menu {
            width: 100%;
            height: var(--menu-height);
            overflow-x: hidden;
            overflow-y: ${isScrollable ? "auto" : "hidden"};
            border-radius: ${isFullScreen ? "0" : "16px 16px 0 0"};
            background-color: var(--green-95);
            position: fixed;
            left: 0px;
            right: 0px;
            bottom: 0px;
            z-index: 999;
            transform: translateY(0); /* open by default */
            opacity: 1;
            transition: transform cubic-bezier(0.19, 1, 0.22, 1)
              ${SLIDE_TRANSITION_MS}ms;
            padding-top: ${isFullScreen ? "0" : "24px"};
            box-sizing: border-box;
          }
          .overlay {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: 0;
            cursor: pointer;
            z-index: 998;
            background: var(--green-120);
            opacity: 0.7;
            transition: opacity cubic-bezier(0.19, 1, 0.22, 1) 0.445s,
              visiblity 0.445s;
          }
          .overlay.closed {
            opacity: 0;
            visiblity: hidden;
            pointer-events: none;
          }
          .dark {
            background-color: var(--hunter-green);
          }
          .slide_up_menu.closed {
            transform: translateY(100%);
            transition: transform cubic-bezier(0.19, 1, 0.22, 1)
                ${SLIDE_TRANSITION_MS}ms,
              // Drop opacity all at once at the end.
              opacity 0ms ${SLIDE_TRANSITION_MS}ms;
            opacity: 0;
            pointer-events: none;
          }
          .slide_up_close {
            position: absolute;
            z-index: 2;
            top: ${isFullScreen ? 16 : 24}px;
            right: ${isFullScreen ? 16 : 24}px;
          }
          .circle_close {
            background: rgba(0, 20, 19, 0.75);
            padding: 8px;
            border-radius: 100%;
          }
          h3 {
            margin: 0;
          }
          .slide_up_header {
            position: sticky;
            display: flex;
            justify-content: space-between;
            width: 100%;
            top: -25px;

            box-sizing: border-box;
            padding: 0 24px 16px 24px;
            align-items: center;
          }
        `}
      </style>
    </>
  )
}

SharedSlideUpMenu.defaultProps = {
  size: "medium",
  isFullScreen: false,
}
