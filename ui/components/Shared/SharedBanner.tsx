import classNames from "classnames"
import React, { CSSProperties, ReactElement } from "react"
import { useLocalStorage } from "../../hooks"
import SharedIcon from "./SharedIcon"

type BannerProps = {
  children: React.ReactNode
  icon?: string
  iconColor?: string
  iconAriaLabel?: string
  hasShadow?: boolean
  style?: CSSProperties
}

export type CanBeClosedProps =
  | { canBeClosed: true; id: string }
  | { canBeClosed?: false; id?: never }

function Banner(props: BannerProps): ReactElement {
  const {
    icon,
    iconColor,
    iconAriaLabel,
    hasShadow = false,
    style,
    children,
  } = props

  return (
    <div
      className={classNames("banner_wrap", {
        shadow: hasShadow,
      })}
      style={style}
    >
      {icon && (
        <SharedIcon
          icon={`icons/m/${icon}.svg`}
          color={iconColor}
          width={24}
          ariaLabel={iconAriaLabel}
          style={{ flexShrink: 0, marginRight: 8 }}
        />
      )}
      <div className="banner_content">{children}</div>
      <style jsx>
        {`
          .banner_wrap {
            width: 336px;
            background: var(--green-120);
            border-radius: 8px;
            padding: 8px;
            display: flex;
            flex-direction: row;
            align-items: start;
            position: relative;
          }
          .banner_wrap.shadow {
            box-shadow:
              0px 16px 16px rgba(7, 17, 17, 0.3),
              0px 6px 8px rgba(7, 17, 17, 0.24),
              0px 2px 4px rgba(7, 17, 17, 0.34);
          }
          .banner_content {
            margin: 2px 0;
            width: 100%;
          }
        `}
      </style>
    </div>
  )
}

function BannerWithClose(
  props: BannerProps & { id: string },
): ReactElement | null {
  const { id, children, icon, iconColor, style, iconAriaLabel, hasShadow } =
    props
  const [isVisible, setIsVisible] = useLocalStorage(`banner_${id}`, "true")

  if (isVisible === "false") return null

  return (
    <Banner
      icon={icon}
      iconColor={iconColor}
      iconAriaLabel={iconAriaLabel}
      style={style}
      hasShadow={hasShadow}
    >
      <SharedIcon
        onClick={() => setIsVisible("false")}
        icon="icons/s/close.svg"
        ariaLabel="close"
        width={16}
        color="var(--green-40)"
        hoverColor="var(--green-20)"
        style={{ position: "absolute", top: 12, right: 12 }}
      />
      {children}
    </Banner>
  )
}

export default function SharedBanner(
  props: BannerProps & CanBeClosedProps,
): ReactElement | null {
  const { canBeClosed = false, id, ...bannerProps } = props

  if (canBeClosed && id) return BannerWithClose({ id, ...bannerProps })

  return Banner({ ...bannerProps })
}
