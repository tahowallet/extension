import classNames from "classnames"
import React, { ReactElement, useEffect, useRef, useState } from "react"
import SharedIcon from "./SharedIcon"

const DELAY = 250

export default function SharedAccordion({
  headerElement,
  contentElement,
  contentHeight,
  isInitiallyOpen = false,
  style = {},
  onChange,
}: {
  headerElement: ReactElement
  contentElement: ReactElement | ((isOpen: boolean) => React.ReactNode)
  onChange?: (isOpen: boolean) => void
  contentHeight?: number
  isInitiallyOpen?: boolean
  style?: React.CSSProperties & Record<string, unknown>
}): ReactElement {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(isInitiallyOpen)
  /**
   * Accordion content has an overflow hidden property when it is closed.
   * The overflow property is changed to visible after a delay when the content is visible.
   * The goal is to display the tooltip message correctly.
   */
  const [isVisible, setIsVisible] = useState(isInitiallyOpen)
  /* If the accordion is open by default, the first opening should be without a transition. */
  const [withTransition, setWithTransition] = useState(!isInitiallyOpen)
  const [height, setHeight] = useState(
    isInitiallyOpen && contentHeight ? contentHeight : 0,
  )

  const toggle = () => {
    setWithTransition(true)
    setIsOpen((open) => !open)
    onChange?.(!isOpen)
  }

  useEffect(() => {
    setHeight(contentHeight ?? contentRef.current?.clientHeight ?? 600)
  }, [contentRef, contentElement, contentHeight])

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        setIsVisible(isOpen)
      },
      isOpen ? 140 : 50,
    )
    return () => clearTimeout(timeout)
  }, [isOpen])

  return (
    <div className="accordion" aria-expanded={isOpen} style={style}>
      <div
        className="accordion_header"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && toggle()}
        onClick={toggle}
      >
        <div className="accordion_header_content">{headerElement}</div>
        <SharedIcon
          icon="icons/s/arrow-toggle.svg"
          width={16}
          color="var(--green-5)"
          hoverColor="#fff"
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          style={{
            margin: "2px 0 2px 8px",
            transform: `rotate(${isOpen ? "180" : "0"}deg)`,
            transition: "transform 100ms",
          }}
        />
      </div>
      <div
        className={classNames("accordion_content", {
          visible: isOpen,
        })}
      >
        <div ref={contentRef}>
          {typeof contentElement === "function"
            ? contentElement(isOpen)
            : contentElement}
        </div>
      </div>
      <style jsx>{`
        .accordion {
          background-color: ${isOpen
            ? "var(--background, var(--green-120))"
            : ""};
        }

        .accordion:not([aria-expanded="true"]):hover {
          background-color: var(--background-hover, none);
        }

        .accordion_header {
          display: flex;
          align-items: center;
          padding: var(--header-padding, "4px 8px");
          cursor: pointer;
        }

        .accordion_header_content {
          flex: 1 0 auto;
          max-width: calc(100% - 24px);
        }

        .accordion_content {
          max-height: 0;
          overflow: hidden;
          transition:
            max-height ${DELAY}ms ease-out,
            opacity var(--content-fade-in-duration, 130ms) ease-in;
          opacity: 0;
        }
        .accordion_content.visible {
          max-height: ${height + 10}px;
          transition:
            max-height ${withTransition ? DELAY : 0}ms ease-in,
            opacity var(--content-fade-in-duration, 130ms) ease-in;
          opacity: 1;
          overflow: ${isVisible ? "visible" : "hidden"};
        }
      `}</style>
    </div>
  )
}
