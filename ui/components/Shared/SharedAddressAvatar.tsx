import React, { ReactElement } from "react"

export default function SharedAddressAvatar({
  address,
}: {
  address: string
}): ReactElement {
  return (
    <div className="avatar">
      <style jsx>{`
        .avatar {
          width: 40px;
          height: 40px;
          background-color: var(--castle-black);
          background-image: url("https://effigy.im/a/${address}.png");
          background-size: cover;
          border-radius: 999px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
