import React, { ReactElement } from "react"

/*
@TODO Switch to using our own resolution service, especially
once we upgrade our service to support whatever else Effigy can do.
*/
export default function SharedAddressAvatar({
  address,
  url,
}: {
  address: string
  url?: string
}): ReactElement {
  return (
    <div className="avatar">
      <style jsx>{`
        .avatar {
          width: 40px;
          height: 40px;
          background-color: var(--castle-black);
          background-image: url("${typeof url !== "undefined"
            ? url
            : `https://effigy.im/a/${address}.png`}");
          background-size: cover;
          border-radius: 999px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
