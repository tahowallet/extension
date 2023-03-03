import React, { ReactElement } from "react"

type SharedLoadingDoggoProps = {
  size: number
  message?: string
  padding?: React.CSSProperties["padding"]
  margin?: React.CSSProperties["margin"]
  animated?: boolean
}

export default function SharedLoadingDoggo({
  size,
  message,
  padding = "0",
  margin = "0",
  animated: animate = true,
}: SharedLoadingDoggoProps): ReactElement {
  return (
    <div data-testid="loading_doggo">
      <img
        width={size}
        height={size}
        alt="Loading..."
        src="/images/loading_doggo.gif"
      />
      {message && <span>{message}</span>}
      <style jsx>{`
        @keyframes loading-dots {
          0% {
            content: ".";
          }
          33% {
            content: "..";
          }
          66% {
            content: "...";
          }
          100% {
            content: "....";
          }
        }
        div {
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: ${padding};
          margin: ${margin};
        }

        span {
          color: var(--green-20);
        }

        span::after {
          content: "";
          animation: loading-dots 2s ease-in forwards;
          animation-play-state: ${animate ? "running" : "paused"};
        }

        img {
          display: block;
          object-fit: contain;
          object-position: center;
        }
      `}</style>
    </div>
  )
}
