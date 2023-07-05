import React from "react"

type SVGWithTextProps = {
  alt: string
  text: string
}

/**
 * Used on extension popup in signing pages
 */
function Small({ alt, text }: SVGWithTextProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={273}
      height={73}
      fill="none"
      aria-label={alt}
    >
      <style jsx>{`
        svg {
          flex-shrink: 0;
        }
        .content {
          font-family: Segment;
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.03em;
          text-align: center;
          fill: var(--success);
        }
      `}</style>
      <g opacity={0.7}>
        <g filter="url(#a)">
          <path
            fill="#81ABA8"
            fillRule="evenodd"
            d="M246.522 40.557a4 4 0 004-4V6a4 4 0 00-4-4H20a4 4 0 00-4 4v30.557a4 4 0 004 4h226.522z"
            clipRule="evenodd"
          />
        </g>
        <path
          fill="#183736"
          d="M251 37a4 4 0 01-4 4H89a4 4 0 01-4-4V6a4 4 0 014-4h158a4 4 0 014 4v31z"
        />
        <path
          fill="#122B29"
          d="M246 30a4 4 0 01-4 4H82a4 4 0 01-4-4V12a4 4 0 014-4h160a4 4 0 014 4v18z"
        />
        <path
          fill="#81ABA8"
          d="M16 6a4 4 0 014-4h105.502c10.648 0 19.279 8.631 19.279 19.279 0 10.647-8.631 19.278-19.279 19.278H20a4 4 0 01-4-4V6z"
        />
        <circle cx={125.503} cy={21.278} r={12.61} stroke="#20C580" />
        <path
          fill="#183736"
          fillRule="evenodd"
          d="M249.751 15.11h3.398a2 2 0 012 2v1.084h3.398c.947 0 1.741.658 1.948 1.542h10.619a1 1 0 011 1v1.085a1 1 0 01-1 1h-10.619a2.002 2.002 0 01-1.948 1.542h-3.398v1.085a2 2 0 01-2 2h-3.398V15.109z"
          clipRule="evenodd"
        />
        <path fill="#122B29" d="M251 15.109h1.542v12.338H251z" />
        <g clipPath="url(#b)">
          <path
            fill="#071111"
            d="M73.467 29.367v1.165h8.018v-5.255h-1.168v4.09h-6.85zm0-17.342v1.165h6.85v4.09h1.168v-5.255h-8.018zm-4.135 9.014V18.33h1.833c.894 0 1.214.297 1.214 1.108v.48c0 .834-.31 1.12-1.214 1.12h-1.833zm2.91.48c.836-.218 1.42-.994 1.42-1.92 0-.582-.23-1.108-.664-1.53-.55-.526-1.284-.789-2.234-.789h-2.577v7.997h1.145V22.09h1.719c.881 0 1.236.365 1.236 1.28v1.907h1.169v-1.725c0-1.256-.298-1.736-1.214-1.873v-.16zm-9.645.262h3.528v-1.05h-3.528v-2.4h3.872V17.28h-5.04v7.997h5.212v-1.051h-4.044v-2.445zm-3.837.423v.548c0 1.154-.424 1.531-1.489 1.531h-.252c-1.065 0-1.58-.343-1.58-1.93v-2.148c0-1.6.538-1.931 1.603-1.931h.229c1.042 0 1.374.388 1.386 1.462h1.26c-.115-1.576-1.168-2.57-2.75-2.57-.766 0-1.408.24-1.889.697-.721.674-1.122 1.816-1.122 3.416 0 1.542.343 2.684 1.053 3.392a2.6 2.6 0 001.799.72c.687 0 1.317-.274 1.637-.868h.16v.754h1.054v-4.124h-3.104v1.05h2.005zM48.658 18.33h1.249c1.18 0 1.821.297 1.821 1.896v2.102c0 1.6-.642 1.897-1.821 1.897h-1.249V18.33zm1.352 6.946c2.187 0 3-1.656 3-3.998 0-2.377-.87-3.999-3.023-3.999h-2.475v7.997h2.498zm-8.03-3.496h3.528v-1.05H41.98v-2.4h3.872v-1.05h-5.04v7.997h5.212v-1.051H41.98v-2.445zm-6.758-4.501h-1.168v7.997h5.27v-1.051h-4.102V17.28zm-9.197 7.997v5.255h8.018v-1.165h-6.85v-4.09h-1.168zm0-13.252v5.255h1.168v-4.09h6.85v-1.165h-8.018z"
          />
        </g>
        <path
          fill="url(#c)"
          fillRule="evenodd"
          d="M251 37a4 4 0 01-4 4H89c-.66 0-1.282-.16-1.831-.443H20a4 4 0 01-4-4V6a4 4 0 014-4h227a4 4 0 014 4v9.11h2.149a2 2 0 012 2v1.084h3.398c.947 0 1.741.658 1.948 1.542H271.5a1 1 0 011 1v1.085a1 1 0 01-1 1h-11.005a2.002 2.002 0 01-1.948 1.542h-3.398v1.085a2 2 0 01-2 2H251V37z"
          clipRule="evenodd"
          opacity={0.2}
        />
      </g>
      <circle cx={126} cy={21} r={14} fill="#122B29" />
      <path
        fill="#20C580"
        fillRule="evenodd"
        d="M126 29.5a8.5 8.5 0 008.496-8.754l1.372-1.372c.087.53.132 1.072.132 1.626 0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10c2.7 0 5.15 1.07 6.949 2.809l-1.061 1.06A8.5 8.5 0 10126 29.5zm2.445-5.884l8.085-8.086-1.06-1.06-8.086 8.085a1.25 1.25 0 01-1.768 0l-3.086-3.085-1.06 1.06 3.086 3.086a2.75 2.75 0 003.889 0z"
        clipRule="evenodd"
      />
      <text
        className="content"
        x="154"
        y="27"
        lengthAdjust="spacingAndGlyphs"
        textLength="83"
      >
        {text}
      </text>
      <defs>
        <linearGradient
          id="c"
          x1={248.825}
          x2={243.924}
          y1={2.424}
          y2={59.155}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.109} stopColor="#CCD3D3" stopOpacity={0} />
          <stop offset={0.951} stopColor="#DEE8E8" />
        </linearGradient>
        <clipPath id="b">
          <path fill="#fff" d="M26.025 12.025h55.522v18.508H26.025z" />
        </clipPath>
        <filter
          id="a"
          width={266.522}
          height={72.557}
          x={0}
          y={0}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy={2} />
          <feGaussianBlur stdDeviation={2} />
          <feColorMatrix values="0 0 0 0 0.027451 0 0 0 0 0.0666667 0 0 0 0 0.0666667 0 0 0 0.34 0" />
          <feBlend
            in2="BackgroundImageFix"
            result="effect1_dropShadow_7627_184384"
          />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy={6} />
          <feGaussianBlur stdDeviation={4} />
          <feColorMatrix values="0 0 0 0 0.027451 0 0 0 0 0.0666667 0 0 0 0 0.0666667 0 0 0 0.24 0" />
          <feBlend
            in2="effect1_dropShadow_7627_184384"
            result="effect2_dropShadow_7627_184384"
          />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feOffset dy={16} />
          <feGaussianBlur stdDeviation={8} />
          <feColorMatrix values="0 0 0 0 0.027451 0 0 0 0 0.0666667 0 0 0 0 0.0666667 0 0 0 0.3 0" />
          <feBlend
            in2="effect2_dropShadow_7627_184384"
            result="effect3_dropShadow_7627_184384"
          />
          <feBlend
            in="SourceGraphic"
            in2="effect3_dropShadow_7627_184384"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * Used on onboarding and tab views
 */
function Large({ alt, text }: SVGWithTextProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      id="Layer_1"
      x={0}
      y={0}
      width="318"
      height="84"
      viewBox="0 0 318 84"
      aria-label={alt}
    >
      <style jsx>{`
        svg {
          flex-shrink: 0;
        }
        .st1 {
          fill: #ccd3d3;
        }
        .st2 {
          fill: #33514e;
        }
        .st3 {
          fill: #193330;
        }
        .content {
          font-family: Segment;
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.03em;
          text-align: center;
          fill: var(--success);
        }
      `}</style>
      <g opacity={0.4}>
        <path
          d="M20 2c-2.2 0-4 1.8-4 4v42c0 2.2 1.8 4 4 4h265c2.2 0 4-1.8 4-4V6c0-2.2-1.8-4-4-4H20z"
          className="st1"
        />
        <path
          d="M285 52H109c-2.2 0-4-1.8-4-4V6c0-2.2 1.8-4 4-4h176c2.2 0 4 1.8 4 4v42c0 2.2-1.8 4-4 4z"
          className="st2"
        />
        <path
          d="M277 44H101c-2.2 0-4-1.8-4-4V14c0-2.2 1.8-4 4-4h176c2.2 0 4 1.8 4 4v26c0 2.2-1.8 4-4 4z"
          className="st3"
        />
        <path
          d="M16 6c0-2.2 1.8-4 4-4h138c13.8 0 25 11.2 25 25s-11.2 25-25 25H20c-2.2 0-4-1.8-4-4V6z"
          className="st1"
        />
        <circle cx={158} cy={27} r={16.5} fill="none" stroke="#99a8a7" />
        <path
          d="M288 19h5c1.1 0 2 .9 2 2v2h5c1.1 0 2 .9 2 2h14c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1h-14c0 1.1-.9 2-2 2h-5v2c0 1.1-.9 2-2 2h-5V19z"
          className="st2"
        />
        <path d="M289 19h2v16h-2z" className="st3" />
        <path
          d="M90.5 37.5V39h10.4v-6.8h-1.5v5.3h-8.9zm0-22.5v1.5h8.9v5.3h1.5V15H90.5zm-5.3 11.7v-3.5h2.4c1.2 0 1.6.4 1.6 1.4v.6c0 1.1-.4 1.5-1.6 1.5h-2.4zm3.7.6c1.1-.3 1.8-1.3 1.8-2.5 0-.8-.3-1.4-.9-2-.7-.7-1.7-1-2.9-1h-3.3v10.4h1.5v-4.1h2.2c1.1 0 1.6.5 1.6 1.7v2.5h1.5v-2.2c0-1.6-.4-2.3-1.6-2.4v-.4zm-12.5.4H81v-1.4h-4.6v-3.1h5v-1.4h-6.5v10.4h6.8v-1.4h-5.2v-3.1zm-4.9.5v.7c0 1.5-.5 2-1.9 2h-.3c-1.4 0-2-.4-2-2.5v-2.8c0-2.1.7-2.5 2.1-2.5h.3c1.4 0 1.8.5 1.8 1.9H73c-.1-2-1.5-3.3-3.6-3.3-1 0-1.8.3-2.5.9-.9.9-1.5 2.4-1.5 4.4 0 2 .4 3.5 1.4 4.4.6.6 1.5.9 2.3.9.9 0 1.7-.4 2.1-1.1h.2v1h1.4v-5.3h-4v1.4h2.7zm-13.1-5H60c1.5 0 2.4.4 2.4 2.5v2.7c0 2.1-.8 2.5-2.4 2.5h-1.6v-7.7zm1.7 9c2.8 0 3.9-2.1 3.9-5.2s-1.1-5.2-3.9-5.2h-3.2v10.4h3.2zm-10.4-4.5h4.6v-1.4h-4.6v-3.1h5v-1.4h-6.5v10.4H55v-1.4h-5.2v-3.1zm-8.8-5.9h-1.5v10.4h6.8v-1.4h-5.3v-9zM29 32.2V39h10.4v-1.5h-8.9v-5.3H29zM29 15v6.8h1.5v-5.3h8.9V15H29z"
          fill="#032724"
        />
        <linearGradient
          id="SVGID_1_"
          x1={169.104}
          x2={162.748}
          y1={96.307}
          y2={22.741}
          gradientTransform="matrix(1 0 0 -1 0 86)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.109} stopColor="#ccd3d3" stopOpacity={0} />
          <stop offset={0.951} stopColor="#dee8e8" />
        </linearGradient>
        <path
          d="M16 6c0-2.2 1.8-4 4-4h265c2.2 0 4 1.8 4 4v13h4c1.1 0 2 .9 2 2v2h5c1.1 0 2 .9 2 2h14.5c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1H302c0 1.1-.9 2-2 2h-5v2c0 1.1-.9 2-2 2h-4v13c0 2.2-1.8 4-4 4H20c-2.2 0-4-1.8-4-4V6z"
          opacity={0.2}
          fill="url(#SVGID_1_)"
        />
      </g>
      <circle cx={156} cy={27} r={27} className="st3" />
      <linearGradient
        id="SVGID_2_"
        x1={144.72}
        x2={171.243}
        y1={58.882}
        y2={60.366}
        gradientTransform="matrix(1 0 0 -1 0 86)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#22c480" />
        <stop offset={1} stopColor="#2bd78f" />
      </linearGradient>
      <path
        d="M161.9 10.5c-1.9-.7-3.9-1.1-6.1-1.1-9.5 0-17.1 7.7-17.1 17.1 0 9.5 7.7 17.1 17.1 17.1 9.5 0 17.1-7.7 17.1-17.1v-.6l-4.4 5.4c-2 5.1-6.9 8.8-12.8 8.8-7.5 0-13.6-6.1-13.6-13.6s6.1-13.6 13.6-13.6c1.3 0 2.6.2 3.7.5l2.5-2.9z"
        fill="url(#SVGID_2_)"
      />
      <linearGradient
        id="SVGID_3_"
        x1={159.864}
        x2={165.41}
        y1={68.013}
        y2={59.007}
        gradientTransform="matrix(1 0 0 -1 0 86)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#22c480" />
        <stop offset={1} stopColor="#2bd78f" />
      </linearGradient>
      <path
        d="M172 12.3c.8.6.9 1.7.3 2.4l-13.5 16.8c-.3.4-.7.6-1.2.6s-.9-.1-1.3-.4l-7.9-7.1c-.7-.6-.8-1.7-.1-2.5.6-.7 1.7-.8 2.5-.1l6.6 5.9 12.3-15.3c.4-.8 1.5-.9 2.3-.3z"
        fill="url(#SVGID_3_)"
      />
      <text
        className="content"
        x="189"
        y="31.59"
        lengthAdjust="spacingAndGlyphs"
        textLength="83"
      >
        {text}
      </text>
    </svg>
  )
}

const LedgerConnectedSvg = { Large, Small }

export default LedgerConnectedSvg
