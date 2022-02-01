import classNames from "classnames"
import React, { ReactElement, useState, useEffect, CSSProperties } from "react"

export type SharedSlideUpMenuSize =
  | "auto"
  | "small"
  | "medium"
  | "large"
  | "custom"

interface Props {
  isOpen: boolean
  close: () => void
  children: React.ReactNode
  customSize?: string
  size: SharedSlideUpMenuSize
  showOverlay?: boolean
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
    showOverlay,
    alwaysRenderChildren,
  } = props
  const [forceHide, setForceHide] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setForceHide(false)
    }
  }, [isOpen])

  const menuHeight = menuHeights[size] ?? customSize ?? menuHeights.medium

  return (
    <>
      {showOverlay && (
        <div className={classNames("overlay", { closed: !isOpen })} />
      )}
      <div
        className={classNames("slide_up_menu", {
          large: size === "large",
          closed: !isOpen,
          force_hide: forceHide,
        })}
        style={{ "--menu-height": menuHeight } as CSSProperties}
      >
        <button
          type="button"
          className="icon_close"
          onClick={close}
          aria-label="Close menu"
        />
        {isOpen || alwaysRenderChildren ? children : <></>}
      </div>
      <style jsx>
        {`
          .slide_up_menu {
            width: 100%;
            height: var(--menu-height);
            overflow-y: auto;
            overflow-x: hidden;
            border-radius: 16px;
            background-color: var(--green-95);
            position: fixed;
            left: 0px;
            right: 0px;
            bottom: 0px;
            z-index: 999;
            transform: translateY(0); /* open by default */
            transition: transform cubic-bezier(0.19, 1, 0.22, 1) 0.445s;
            padding-top: 24px;
            box-sizing: border-box;
          }
          .overlay {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: 0;
            z-index: 998;
            background: var(--hunter-green);
            opacity: 0.8;
            transition: opacity cubic-bezier(0.19, 1, 0.22, 1) 0.445s,
              visiblity 0.445s;
          }
          .overlay.closed {
            opacity: 0;
            visiblity: hidden;
            pointer-events: none;
          }
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 12px;
            height: 12px;
            position: absolute;
            background-color: var(--green-20);
            z-index: 2;
            position: sticky;
            top: 0px;
            right: 24px;
            float: right;
          }
          .icon_close:hover {
            background-color: #fff;
          }
          .large {
            background-color: var(--hunter-green);
          }
          .slide_up_menu.closed {
            transform: translateY(100%);
          }
          .force_hide {
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
