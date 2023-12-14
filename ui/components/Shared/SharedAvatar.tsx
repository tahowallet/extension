import React, { CSSProperties } from "react"

type SharedAvatarProps = {
  width: string
  background?: string
  borderRadius?: string
  avatarURL?: string
  backupAvatar: string
  style?: CSSProperties
}

export default function SharedAvatar({
  width,
  background = "var(--green-40)",
  borderRadius = "12px",
  avatarURL,
  backupAvatar,
  style,
}: SharedAvatarProps) {
  return (
    <>
      <div className="avatar" style={style} />
      <style jsx>{`
        .avatar {
          width: ${width};
          height: ${width};
          border-radius: ${borderRadius}
          background-size: cover;
          flex-shrink: 0;
          background-color: ${background};
          background: url("${avatarURL ?? backupAvatar}") center no-repeat;
        }
      `}</style>
    </>
  )
}
