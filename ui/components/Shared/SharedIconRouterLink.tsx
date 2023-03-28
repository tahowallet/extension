import React, { ReactElement } from "react"
import { Link } from "react-router-dom"

type Props = {
  path: string
  state: { [key: string]: unknown }
  iconClass: string
  disabled?: boolean
}

export default function SharedIconRouterLink(props: Props): ReactElement {
  const { path, state, iconClass, disabled } = props

  if (disabled) {
    return (
      // @TODO Make accessible
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="icon_wrapper"
      >
        <i className={`asset_icon ${iconClass}`} />
      </div>
    )
  }

  return (
    <Link
      to={{
        pathname: path,
        state,
      }}
      className="router_link_container"
    >
      <div className="icon_wrapper">
        <i className={`asset_icon ${iconClass}`} />
      </div>
      <style jsx global>{`
        .router_link_container {
          margin: auto 4px;
          border-radius: 4px;
        }
        .icon_wrapper {
          display: flex;
          padding: 0.5em;
        }
        .router_link_container:hover {
          background-color: var(--hunter-green);
          color: var(--trophy-gold);
        }
        .router_link_container:hover .asset_icon {
          background-color: var(--trophy-gold);
        }
      `}</style>
    </Link>
  )
}
