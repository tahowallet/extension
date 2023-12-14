import React, { ReactElement } from "react"
import SharedAvatar from "./SharedAvatar"

type SharedAddressAvatarProps = {
  address: string
  url?: string
  avatarType?: string
}

/*
@TODO Switch to using our own resolution service, especially
once we upgrade our service to support whatever else Effigy can do.
*/
export default function SharedAddressAvatar({
  address,
  url,
  avatarType,
}: SharedAddressAvatarProps): ReactElement {
  return (
    <SharedAvatar
      width="40px"
      background="var(--castle-black)"
      avatarURL={url}
      avatarType={avatarType}
      backupAvatar={`https://effigy.im/a/${address}.png`}
      borderRadius="999px"
    />
  )
}
