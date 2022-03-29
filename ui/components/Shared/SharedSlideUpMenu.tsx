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
  const { isOpen, close, size, children, customSize, alwaysRenderChildren } =
    props

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
        <SharedIcon
          icon="close.svg"
          width={12}
          color="var(--green-20)"
          hoverColor="#fff"
          customStyles={`
            position: absolute;
            z-index: 2;
            position: sticky;
            top: 0px;
            right: 24px;
            float: right;`}
          ariaLabel="Close menu"
          onClick={(e) => {
            close(e)
          }}
        />
        {displayChildren}
      </div>
      <style jsx>
        {`
          .slide_up_menu {
            width: 100%;
            height: var(--menu-height);
            overflow: hidden;
            border-radius: 16px;
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
            padding-top: 24px;
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
        `}
      </style>
    </>
  )
}

SharedSlideUpMenu.defaultProps = {
  size: "medium",
}
