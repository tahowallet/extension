import React, { ReactElement, ReactNode } from "react"
import CorePage from "../../components/Core/CorePage"
import SharedBackButton from "../../components/Shared/SharedBackButton"

type Props = {
  title: string
  children: ReactNode
}

export default function SettingsPage({ title, children }: Props): ReactElement {
  return (
    <CorePage hasTabBar standardWidth="padded" contentAlign="start">
      <header>
        <SharedBackButton withoutBackText path="/settings" />
        <h1>{title}</h1>
        <style jsx>{`
          h1 {
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            padding: 0px;
            margin: -5px 0px 0px 0px;
          }
          header {
            display: flex;
            flex-direction: row;
            gap: 8px;
            margin: 25px 0 15px;
          }
        `}</style>
      </header>
      {children}
    </CorePage>
  )
}
