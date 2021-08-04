import React from "react"
import PropTypes from "prop-types"
import { goTo } from "react-chrome-extension-router"

export default function SharedButtonLink(props) {
  const { children, component } = props

  return (
    <button
      type="button"
      onClick={() => {
        goTo(component)
      }}
    >
      {children}
    </button>
  )
}

SharedButtonLink.propTypes = {
  children: PropTypes.node.isRequired,
  component: PropTypes.func.isRequired,
}
