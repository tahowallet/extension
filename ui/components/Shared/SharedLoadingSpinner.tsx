import React, { ReactElement, useMemo } from "react"
import classNames from "classnames"
import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"

type SharedLoadingSpinnerProps = {
  size: "small" | "medium"
  variant?: "dark-gold" | "transparent"
}

function getVariantStyles(
  variant: Exclude<SharedLoadingSpinnerProps["variant"], undefined>
) {
  let styles: [string, string]
  switch (variant) {
    case "dark-gold":
      styles = ["var(--green-80)", "var(--trophygold)"]
      break

    case "transparent":
      styles = ["var(--green-20)", "transparent"]
      break

    default:
      assertUnreachable(variant)
  }

  return styles
}

export default function SharedLoadingSpinner(
  props: SharedLoadingSpinnerProps
): ReactElement {
  const { size, variant = "dark-gold" } = props

  const [color, accent] = useMemo(() => getVariantStyles(variant), [variant])
  return (
    <div className={classNames("spinner", size)}>
      <style jsx>
        {`
          .spinner {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid ${color};
            border-top-color: ${accent};
            box-sizing: border-box;
            animation: spinner 1s linear infinite;
          }
          @keyframes spinner {
            to {
              transform: rotate(360deg);
            }
          }
          .small {
            width: 14px;
            height: 14px;
            animation: spinner 0.8s linear infinite;
          }
        `}
      </style>
    </div>
  )
}

SharedLoadingSpinner.defaultProps = {
  size: "medium",
}
