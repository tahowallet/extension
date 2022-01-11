import classNames from "classnames"
import React, { ReactElement, useState, useEffect } from "react"

interface Props {
  isOpen: boolean
  close: () => void
  children: React.ReactNode
  customSize?: string
  size: "small" | "medium" | "large" | "custom"
}

export default function SharedSlideUpMenu(props: Props): ReactElement {
  const { isOpen, close, size, children, customSize } = props
  const [forceHide, setForceHide] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setForceHide(false)
    }
  }, [isOpen])

  let menuHeight = "536px"
  if (size === "large") {
    menuHeight = "600px"
  } else if (size === "small") {
    menuHeight = "268px"
  } else if (size === "custom") {
    menuHeight = customSize || "600px"
  }

  return (
    <div
      className={classNames("slide_up_menu", {
        large: size === "large",
        closed: !isOpen,
        force_hide: forceHide,
      })}
    >
      <button
        type="button"
        className="icon_close"
        onClick={close}
        aria-label="Close menu"
      />
      {children}
      <style jsx>
        {`
          .slide_up_menu {
            width: 100%;
            height: ${menuHeight};
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
          .closed {
            transform: translateY(${menuHeight});
          }
          .force_hide {
            opacity: 0;
            pointer-events: none;
          }
        `}
      </style>
    </div>
  )
}

SharedSlideUpMenu.defaultProps = {
  size: "medium",
}
