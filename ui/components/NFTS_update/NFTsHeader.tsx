import React, { ReactElement } from "react"
import { HeaderContainer, EmptyHeader } from "./NFTsHeaderBase"

type HeaderProps = {
  hasAccounts: boolean
}

export default function NFTsHeader({ hasAccounts }: HeaderProps): ReactElement {
  if (!hasAccounts) {
    return (
      <HeaderContainer>
        <EmptyHeader />
      </HeaderContainer>
    )
  }

  return <div>{/* TODO */}</div>
}
