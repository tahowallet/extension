import React, { ReactElement } from "react"
import { useLocalStorage } from "../../hooks"
import SharedIcon from "./SharedIcon"

type BannerProps = {
  children: React.ReactNode
  icon?: string
  iconColor?: string
  iconAriaLabel?: string
  customStyles?: string
}

type CanBeClosedProps =
  | { canBeClosed: true; id: string }
  | { canBeClosed?: false; id?: never }

function Banner(props: BannerProps): ReactElement {
  const { icon, iconColor, iconAriaLabel, customStyles = "", children } = props

  return (
    <div className="banner_wrap">
      {icon && (
        <SharedIcon
          icon={`icons/m/${icon}.svg`}
          color={iconColor}
          width={24}
          ariaLabel={iconAriaLabel}
          customStyles="flex-shrink:0; margin-right: 8px;"
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
            ${customStyles};
          }
          .banner_content {
            margin: 2px 0;
          }
        `}
      </style>
    </div>
  )
}

function BannerWithClose(props: BannerProps & { id: string }): ReactElement {
  const { id, children, icon, iconColor, customStyles, iconAriaLabel } = props
  const [isVisible, setIsVisible] = useLocalStorage(`banner_${id}`, "true")

  if (isVisible === "false") return <></>

  return (
    <Banner
      icon={icon}
      iconColor={iconColor}
      iconAriaLabel={iconAriaLabel}
      customStyles={customStyles}
    >
      <SharedIcon
        onClick={() => setIsVisible("false")}
        icon="icons/s/close.svg"
        ariaLabel="close"
        width={16}
        color="var(--green-40)"
        hoverColor="var(--green-20)"
        customStyles={`
              position: absolute;
              top: 12px;
              right: 12px;
            `}
      />
      {children}
    </Banner>
  )
}

export default function SharedBanner(
  props: BannerProps & CanBeClosedProps
): ReactElement {
  const { canBeClosed = false, id, ...bannerProps } = props

  if (canBeClosed && id) return BannerWithClose({ id, ...bannerProps })

  return Banner({ ...bannerProps })
}
