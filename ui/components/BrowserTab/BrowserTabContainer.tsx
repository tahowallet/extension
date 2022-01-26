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
          background: no-repeat 2rem 2rem / auto
              url("/images/logo_horizontal.svg"),
            no-repeat bottom / cover url("/images/tab_background.svg"),
            linear-gradient(to top, #10322f, var(--hunter-green) 100%);
        }
      `}</style>
    </>
  )
}
