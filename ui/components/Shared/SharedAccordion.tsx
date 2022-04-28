import classNames from "classnames"
import React, { ReactElement, useEffect, useRef, useState } from "react"
import SharedIcon from "./SharedIcon"

export default function SharedAccordion({
  headerElement,
  contentElement,
  contentHeight,
}: {
  headerElement: ReactElement
  contentElement: ReactElement
  contentHeight?: number
}): ReactElement {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [height, setHeight] = useState(0)

  const toggle = () => setIsOpen((open) => !open)

  useEffect(() => {
    setHeight(contentHeight ?? contentRef.current?.clientHeight ?? 600)
  }, [contentRef, contentElement, contentHeight])

  return (
    <div className="accordion">
      <div className="accordion_header">
        <div className="accordion_header_content">{headerElement}</div>
        <SharedIcon
          icon="icons/s/arrow-toggle.svg"
          width={16}
          color="var(--green-5)"
          hoverColor="#fff"
          onClick={toggle}
          customStyles={`
            margin: 2px 0 2px 8px;
            transform: rotate(${isOpen ? "180" : "0"}deg);
            transition: transform 100ms;
          `}
        />
      </div>
      <div
        className={classNames("accordion_content", {
          visible: isOpen,
        })}
      >
        <div ref={contentRef}>{contentElement}</div>
      </div>
      <style jsx>{`
        .accordion_header {
          display: flex;
          padding: 4px 8px;
        }
        .accordion_header_content {
          flex: 1 0 auto;
        }
        .accordion_content {
          max-height: 0;
          transition: max-height 250ms ease-out;
          overflow: hidden;
          padding: 0 8px;
        }
        .accordion_content.visible {
          max-height: ${height + 10}px;
        }
      `}</style>
    </div>
  )
}
