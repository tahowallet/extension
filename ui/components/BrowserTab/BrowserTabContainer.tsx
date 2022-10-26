import React, { ReactElement } from "react"

export default function BrowserTabContainer({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  return (
    <>
      <div className="container">{children}</div>
      <style jsx>{`
        .container {
          height: 100%;
          background: radial-gradient(
            ellipse at right top,
            rgba(36, 107, 103, 0.5) 0%,
            rgba(0, 20, 19, 1) 100%
          );
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
    </>
  )
}
