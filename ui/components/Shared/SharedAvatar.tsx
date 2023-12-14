import React, { CSSProperties } from "react"

type SharedAvatarProps = {
  width: string
  background?: string
  borderRadius?: string
  avatarURL?: string
  avatarType?: string
  backupAvatar: string
  style?: CSSProperties
}

export default function SharedAvatar({
  width,
  background = "var(--green-40)",
  borderRadius = "12px",
  avatarURL,
  avatarType,
  backupAvatar,
  style,
}: SharedAvatarProps) {
  return (
    <>
      {avatarType === "video/mp4" ? (
        <div className="video" style={style}>
          <video src={avatarURL} autoPlay muted loop />
        </div>
      ) : (
        <div className="avatar" style={style} />
      )}
      <style jsx>{`
        .avatar {
          width: ${width};
          height: ${width};
          border-radius: ${borderRadius};
          flex-shrink: 0;
          background-color: ${background};
          background: url("${avatarURL ?? backupAvatar}");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .video {
          width: ${width};
          height: ${width};
          border-radius: ${borderRadius};
          background-color: ${background};
          overflow: hidden;
        }
        .video > video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </>
  )
}
