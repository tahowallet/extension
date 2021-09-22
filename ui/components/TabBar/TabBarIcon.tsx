import React, { ReactElement } from "react"
import { Link } from "react-router-dom"

interface Props {
  name: string
  isActive?: boolean
}

export default function TabBarIcon(props: Props): ReactElement {
  const { name, isActive } = props

  return (
    <>
      <Link to={`/${name}`}>
        <div className={`icon${isActive ? " active" : ""}`} />
      </Link>
      <style jsx>
        {`
          .icon {
            mask-image: url("./images/${name}.svg");
            mask-size: 24px 24px;
            width: 24px;
            height: 24px;
            cursor: pointer;
            background-color: var(--green-60);
          }
          .icon:not(.active):hover {
            background-color: var(--green-20);
          }
          .active {
            background-color: var(--trophy-gold);
          }
        `}
      </style>
    </>
  )
}

TabBarIcon.defaultProps = {
  isActive: false,
}
