import React from "react"

export default function OnboardingTip({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <div>
      <div role="presentation" className="quote_icon">
        <span>i</span>
      </div>
      <q>{children}</q>
      <style jsx>
        {`
          .quote_icon {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 20px;
            line-height: 42px;
            text-align: center;
            color: var(--green-60);
            display: flex;
            align-items: center;
            gap: 18px;
            max-width: 350px;
            margin: 0 auto;
            justify-content: center;
          }

          .quote_icon::before,
          .quote_icon::after {
            content: "";
            max-width: 100px;
            display: inline-block;
            flex-grow: 1;
            border: 0.5px solid var(--green-80);
          }

          q {
            font-family: "Segment";
            font-weight: 400;
            font-size: 16px;
            line-height: 16px;
            color: var(--green-40);
            text-align: center;
            display: block;
          }

          q::before,
          q::after {
            content: none;
          }
        `}
      </style>
    </div>
  )
}
