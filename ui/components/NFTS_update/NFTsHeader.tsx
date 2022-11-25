import React, { ReactElement } from "react"
import { HeaderContainer, EmptyHeader } from "./NFTsHeaderBase"

type HeaderProps = {
  hasNFTs: boolean
}

export default function NFTsHeader({ hasNFTs }: HeaderProps): ReactElement {
  if (!hasNFTs) {
    return (
      <HeaderContainer>
        <EmptyHeader />
      </HeaderContainer>
    )
  }

  return <div>{/* TODO */}</div>
}
