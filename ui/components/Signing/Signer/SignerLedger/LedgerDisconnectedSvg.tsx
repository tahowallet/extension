import React from "react"

export default function LedgerDisconnectedSvg({
  alt,
  text,
}: {
  alt: string
  text: string
}): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={273}
      height={73}
      fill="none"
      aria-label={alt}
    >
      <style jsx>
        {`
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
            fill: var(--error);
          }
        `}
      </style>
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
        <circle cx={125.503} cy={21.279} r={12.61} stroke="#EC3137" />
        <path
          fill="#183736"
          fillRule="evenodd"
          d="M249.751 15.11h3.398a2 2 0 012 2v1.084h3.398c.947 0 1.741.658 1.948 1.542h10.619a1 1 0 011 1v1.085a1 1 0 01-1 1h-10.619a2.002 2.002 0 01-1.948 1.542h-3.398v1.085a2 2 0 01-2 2h-3.398V15.109z"
          clipRule="evenodd"
        />
        <path fill="#122B29" d="M251 15.109h1.542v12.338H251z" />
        <g clipPath="url(#b)">
          <path
            fill="#0D2321"
            d="M73.467 29.367v1.165h8.018v-5.255h-1.168v4.09h-6.85zm0-17.342v1.165h6.85v4.09h1.168v-5.255h-8.018zm-4.135 9.014V18.33h1.833c.894 0 1.214.297 1.214 1.108v.48c0 .834-.31 1.12-1.214 1.12h-1.833zm2.91.48c.836-.218 1.42-.994 1.42-1.92 0-.582-.23-1.108-.664-1.53-.55-.526-1.284-.789-2.234-.789h-2.577v7.997h1.145V22.09h1.719c.881 0 1.236.365 1.236 1.28v1.907h1.169v-1.725c0-1.256-.298-1.736-1.214-1.873v-.16zm-9.645.262h3.528v-1.05h-3.528v-2.4h3.872V17.28h-5.04v7.997h5.212v-1.051h-4.044v-2.445zm-3.837.423v.548c0 1.154-.424 1.531-1.489 1.531h-.252c-1.065 0-1.58-.343-1.58-1.93v-2.148c0-1.6.538-1.931 1.603-1.931h.229c1.042 0 1.374.388 1.386 1.462h1.26c-.115-1.576-1.168-2.57-2.75-2.57-.766 0-1.408.24-1.889.697-.721.674-1.122 1.816-1.122 3.416 0 1.542.343 2.684 1.053 3.392a2.6 2.6 0 001.799.72c.687 0 1.317-.274 1.637-.868h.16v.754h1.054v-4.124h-3.104v1.05h2.005zM48.658 18.33h1.249c1.18 0 1.821.297 1.821 1.896v2.102c0 1.6-.642 1.897-1.821 1.897h-1.249V18.33zm1.352 6.946c2.187 0 3-1.656 3-3.998 0-2.377-.87-3.999-3.023-3.999h-2.475v7.997h2.498zm-8.03-3.496h3.528v-1.05H41.98v-2.4h3.872v-1.05h-5.04v7.997h5.212v-1.051H41.98v-2.445zm-6.758-4.501h-1.168v7.997h5.27v-1.051h-4.102V17.28zm-9.197 7.997v5.255h8.018v-1.165h-6.85v-4.09h-1.168zm0-13.252v5.255h1.168v-4.09h6.85v-1.165h-8.018z"
          />
        </g>
        <path
          fill="url(#c)"
          fillRule="evenodd"
          d="M251 37a4 4 0 01-4 4H89c-.66 0-1.282-.16-1.831-.443H20a4 4 0 01-4-4V6a4 4 0 014-4h227a4 4 0 014 4v9.11h2.149a2 2 0 012 2v1.084h3.398c.947 0 1.741.659 1.948 1.543H271.5a1 1 0 011 1v1.084a1 1 0 01-1 1h-11.005a2.001 2.001 0 01-1.948 1.542h-3.398v1.085a2 2 0 01-2 2H251V37z"
          clipRule="evenodd"
          opacity={0.2}
        />
      </g>
      <circle cx={126} cy={21} r={14} fill="#122B29" />
      <path
        fill="#EC3137"
        fillRule="evenodd"
        d="M134.5 21a8.5 8.5 0 01-13.957 6.517l11.974-11.974A8.463 8.463 0 01134.5 21zm-15.017 5.457l11.974-11.974a8.5 8.5 0 00-11.974 11.974zM136 21c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10 10 4.477 10 10z"
        clipRule="evenodd"
      />
      <text
        className="content"
        x="150"
        y="26"
        lengthAdjust="spacingAndGlyphs"
        textLength="89"
      >
        {text}
      </text>
      <defs>
        <linearGradient
          id="c"
          x1={248.825}
          x2={243.924}
          y1={2.425}
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
