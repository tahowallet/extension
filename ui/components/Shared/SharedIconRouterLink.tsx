import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import SharedTooltip from "./SharedTooltip"

type Props = {
  path: string
  state: { [key: string]: unknown }
  iconClass: string
  disabled?: boolean
  isTooltip?: boolean
  tooltipText?: string
}

export default function SharedIconRouterLink(props: Props): ReactElement {
  const { path, state, iconClass, disabled, isTooltip, tooltipText } = props

  if (disabled) {
    return (
      // @TODO Make accessible
      // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="icon_wrapper"
      >
        <i className={`disabled_asset_icon ${iconClass}`} />
      </div>
    )
  }

  return (
    <>
      {isTooltip && tooltipText ? (
        <SharedTooltip
          type="dark"
          horizontalPosition="center"
          verticalPosition="top"
          verticalShift={-10}
          IconComponent={() => (
            <Link
              to={{ pathname: path, state }}
              className="router_link_container"
            >
              <div className="icon_wrapper">
                <i className={`asset_icon ${iconClass}`} />
              </div>
            </Link>
          )}
        >
          {tooltipText}
        </SharedTooltip>
      ) : (
        <Link to={{ pathname: path, state }} className="router_link_container">
          <div className="icon_wrapper">
            <i className={`asset_icon ${iconClass}`} />
          </div>
        </Link>
      )}
      <style jsx global>{`
        .router_link_container {
          margin: auto 4px;
          border-radius: 4px;
        }
        .icon_wrapper {
          display: flex;
          padding: 0.5em;
          border-radius: 4px;
        }
        .disabled_asset_icon {
          mask-size: cover;
          background-color: var(--green-60);
          width: 12px;
          height: 12px;
        }
        .router_link_container:hover .icon_wrapper {
          background-color: var(--icon-tile-hover);
          box-shadow: var(--icon-tile-hover-shadow);
          color: var(--icon-tile-hover-icon);
          --asset-icon-color: var(--icon-tile-hover-icon);
        }
      `}</style>
    </>
  )
}
