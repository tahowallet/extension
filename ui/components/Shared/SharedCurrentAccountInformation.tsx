import React, { ReactElement } from "react"

type Props = {
  shortenedAddress: string
  name: string | undefined
  avatarURL: string | undefined
}

export default function SharedCurrentAccountInformation({
  shortenedAddress,
  name,
  avatarURL,
}: Props): ReactElement {
  return (
    <>
      {name ?? shortenedAddress}
      <div className="avatar" />
      <style jsx>
        {`
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            margin-left: 8px;
            background: url("${avatarURL ?? "./images/portrait.png"}");
            background-color: var(--green-40);
            background-size: cover;
          }
        `}
      </style>
    </>
  )
}
