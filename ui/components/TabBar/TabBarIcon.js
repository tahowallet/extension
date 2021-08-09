import React from "react"
import PropTypes from "prop-types"
import SharedButtonLink from "../Shared/SharedButtonLink"

export default function TabBarIcon(props) {
  const { name, isActive, component } = props

  return (
    <>
      <SharedButtonLink component={component}>
        <div>
          <div className={`icon${isActive ? " active" : ""}`} />
        </div>
      </SharedButtonLink>
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

TabBarIcon.propTypes = {
  name: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  component: PropTypes.func.isRequired,
}

TabBarIcon.defaultProps = {
  isActive: false,
}
