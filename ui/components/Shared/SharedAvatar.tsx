import React, { CSSProperties, useEffect, useState } from "react"

type SharedAvatarProps = {
  width: string
  background?: string
  borderRadius?: string
  avatarURL?: string
  backupAvatar: string
  style?: CSSProperties
}

async function getAvatarType(url?: string) {
  if (!url) return null

  try {
    const fileTypeFetch = await fetch(url, { method: "HEAD" })
    const fileType = fileTypeFetch.headers.get("Content-Type")

    return fileType
  } catch {
    return null
  }
}

export default function SharedAvatar({
  width,
  background = "var(--green-40)",
  borderRadius = "12px",
  avatarURL,
  backupAvatar,
  style,
}: SharedAvatarProps) {
  const [avatarType, setAvatarType] = useState<string | null>(null)

  useEffect(() => {
    const fetchAvatarType = async () => {
      const type = await getAvatarType(avatarURL)
      setAvatarType(type)
    }

    fetchAvatarType()
  }, [avatarURL])

  return (
    <>
      <div className="avatar_container" style={style}>
        {avatarType === "video/mp4" ? (
          <div className="video">
            <video src={avatarURL} autoPlay muted loop />
          </div>
        ) : (
          <div className="avatar" />
        )}
      </div>
      <style jsx>{`
        .avatar_container {
          width: ${width};
          height: ${width};
          border-radius: ${borderRadius};
          background-color: ${background};
          flex-shrink: 0;
        }
        .avatar {
          width: 100%;
          height: 100%;
          border-radius: ${borderRadius};
          flex-shrink: 0;
          background: url("${avatarURL ?? backupAvatar}");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .video {
          width: 100%;
          height: 100%;
          border-radius: ${borderRadius};
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
