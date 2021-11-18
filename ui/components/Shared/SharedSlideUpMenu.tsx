import React, { ReactElement } from "react"

interface Props {
  isOpen: boolean
  close: () => void
  children: React.ReactNode
  size: "small" | "medium" | "large"
}

export default function SharedSlideUpMenu(props: Props): ReactElement {
  const { isOpen, close, size, children } = props

  let menuHeight = "536px"
  if (size === "large") {
    menuHeight = "600px"
  } else if (size === "small") {
    menuHeight = "268px"
  }

  return (
    <div
      className={`slide_up_menu
        ${size === "large" ? " large" : ""}
        ${!isOpen ? " closed" : ""}`}
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
            width: 100vw;
            height: ${menuHeight};
            overflow-y: scroll;
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
            right: 24px;
            background-color: var(--green-20);
            z-index: 1;
          }
          .icon_close:hover {
            background-color: #fff;
          }
          .large {
            background-color: var(--hunter-green);
          }
          .open_animate {
            transform: translateY(0px);
            animation: slideUp cubic-bezier(0.19, 1, 0.22, 1) 0.445s;
            animation-direction: forward;
          }
          .closed {
            transform: translateY(${menuHeight});
          }
        `}
      </style>
    </div>
  )
}

SharedSlideUpMenu.defaultProps = {
  size: "medium",
}
