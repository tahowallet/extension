import React, { ReactElement, useMemo } from "react"
import classNames from "classnames"
import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"

type SharedLoadingSpinnerProps = {
  size: "small" | "medium"
  variant?: "hunter-green" | "dark-green" | "transparent"
}

function getVariantStyles(
  variant: Exclude<SharedLoadingSpinnerProps["variant"], undefined>,
) {
  let styles: [string, string]
  switch (variant) {
    // use for the primary button
    case "hunter-green":
      styles = ["var(--hunter-green)", "var(--trophy-gold)"]
      break
    // use for the secondary button
    case "dark-green":
      styles = ["var(--green-80)", "var(--trophy-gold)"]
      break
    // use for the disabled button
    case "transparent":
      styles = ["var(--green-20)", "transparent"]
      break

    default:
      assertUnreachable(variant)
  }

  return styles
}

export default function SharedLoadingSpinner(
  props: SharedLoadingSpinnerProps,
): ReactElement {
  const { size, variant = "dark-green" } = props

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
