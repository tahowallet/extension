import React, { ReactElement, ReactNode } from "react"

type Props = {
  eyebrow?: ReactNode
  title: ReactNode
  aside?: ReactNode
  children: ReactNode
}

/**
 * Renders the frame of a full-tab section: a header row, with an optional
 * eyebrow above the title and optional `aside` content beside it, above the
 * section's content.
 */
export default function FullTabSection({
  eyebrow,
  title,
  aside,
  children,
}: Props): ReactElement {
  return (
    <div className="section">
      <header>
        <div className="titles">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {typeof title === "string" ? <h1>{title}</h1> : title}
        </div>
        {aside}
      </header>
      <div className="content">{children}</div>
      <style jsx>{`
        .section {
          max-width: 1080px;
          margin: 0 auto;
          padding: 40px 48px 64px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        @media (max-width: 1180px) {
          .section {
            padding: 32px 32px 48px;
          }
        }
        /* Space between a section's blocks, such as a chart and a table. */
        .content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          flex-wrap: wrap;
        }
        .titles {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .eyebrow {
          color: var(--green-40);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          font-family: "Quincy CF", serif;
          font-size: 36px;
          line-height: 44px;
          font-weight: 500;
          color: var(--text-strong);
        }
      `}</style>
    </div>
  )
}
