import React, { ReactElement } from "react"

function BrowserTabContainer({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  return (
    <>
      <div className="container">
        <div className="cover gradient-1" />
        <div className="cover gradient-2" />
        <div className="cover gradient-3" />
        <div className="wrapper">{children}</div>
      </div>

      <style jsx>{`
        .container {
          height: 100%;
          background: #041414;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .wrapper {
          height: 100%;
          width: 100%;
          position: relative;
        }

        .cover {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
        }

        .gradient-3 {
          --originX: calc(71.25vw / 2);
          --originY: calc(97.3vh / 2);
          --left: 39.7vw;
          --top: 60.2vh;
          background: radial-gradient(
            ellipse var(--originX) var(--originY) at calc(var(--left) + var(--originX))
              calc(var(--top) + var(--originY)),
            hsl(175.77, 49.65%, 28.04%),
            hsla(175.77, 49.7%, 27.65%, 0.9657064) 13.11%,
            hsla(175.75, 49.86%, 26.57%, 0.8737997) 24.72%,
            hsla(175.71, 50.14%, 24.92%, 0.7407407) 35.26%,
            hsla(175.66, 50.6%, 22.81%, 0.5829904) 45.16%,
            hsla(175.58, 51.32%, 20.36%, 0.4170096) 54.84%,
            hsla(175.46, 52.47%, 17.72%, 0.2592593) 64.74%,
            hsla(175.29, 54.27%, 15.13%, 0.1262003) 75.28%,
            hsla(175.1, 56.65%, 13.04%, 0.0342936) 86.89%
          );
          opacity: 0.5;
        }

        /* top left to bottom */
        .gradient-2 {
          background: radial-gradient(
            circle,
            rgba(36, 107, 103, 1) 0%,
            rgba(12, 47, 44, 1) 50%,
            rgba(4, 20, 20, 1) 100%
          );
          background-size: 200% 200%;
          animation: gradient 40s ease infinite;
        }

        @keyframes gradient {
          0% {
            background-position: 100% 100%;
          }
          25% {
            background-position: 25% 75%;
          }
          50% {
            background-position: 75% 50%;
          }
          75% {
            background-position: 100% 75%;
          }
          100% {
            background-position: 100% 100%;
          }
        }

        /* bottom right */
        .gradient-1 {
          --originX: calc(143.6vw / 2);
          --originY: calc(196vh / 2);
          --left: 37.2vw;
          --top: -21vh;
          background: radial-gradient(
            ellipse var(--originX) var(--originY) at calc(var(--left) + var(--originX))
              calc(var(--top) + var(--originY)),
            hsl(175.77, 49.65%, 28.04%),
            hsla(175.77, 49.68%, 27.81%, 0.9803241) 9.99%,
            hsla(175.76, 49.77%, 27.18%, 0.9259259) 19.07%,
            hsla(175.74, 49.92%, 26.2%, 0.84375) 27.44%,
            hsla(175.71, 50.14%, 24.92%, 0.7407407) 35.26%,
            hsla(175.68, 50.46%, 23.38%, 0.6238426) 42.72%,
            hsla(175.62, 50.92%, 21.62%, 0.5) 50%,
            hsla(175.55, 51.56%, 19.71%, 0.3761574) 57.28%,
            hsla(175.46, 52.47%, 17.72%, 0.2592593) 64.74%,
            hsla(175.33, 53.76%, 15.75%, 0.15625) 72.56%,
            hsla(175.19, 55.43%, 13.98%, 0.0740741) 80.93%,
            hsla(175, 58.06%, 12.16%, 0) 90.01%
          );
          opacity: 0.45;
        }
      `}</style>
    </>
  )
}

export default BrowserTabContainer
