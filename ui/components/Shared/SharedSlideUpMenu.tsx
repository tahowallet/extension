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

const SLIDE_TRANSITION_MS = 445

interface Props {
  isOpen: boolean
  close: (
    e: MouseEvent | TouchEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void
  children: React.ReactNode
  customSize?: string
  size: SharedSlideUpMenuSize
  isFullScreen?: boolean
  isScrollable?: boolean
  alwaysRenderChildren?: boolean
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
    children,
    customSize,
    isFullScreen,
    isScrollable,
    alwaysRenderChildren,
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
          large: size === "large",
          closed: !isOpen,
        })}
        style={{ "--menu-height": menuHeight } as CSSProperties}
        ref={isOpen ? slideUpMenuRef : null}
      >
        <div
          className={classNames("slide_up_close", {
            hover_content: isFullScreen,
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
          .large {
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
            position: sticky;
            z-index: 2;
            top: 0px;
            right: 24px;
            float: right;
          }
          .slide_up_close.hover_content {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(0, 20, 19, 0.75);
            padding: 8px;
            border-radius: 100%;
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
