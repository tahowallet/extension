import React, { ReactElement } from "react"
import classNames from "classnames"
import { useHistory } from "react-router-dom"

interface Props {
  name: string
  isActive: boolean
}

export default function TabBarIcon(props: Props): ReactElement {
  const history = useHistory()

  const { name, isActive } = props

  return (
    <>
      <button
        type="button"
        onClick={() => {
          history.push(`/${name}`)
        }}
      >
        <div className={classNames("tab_bar_icon_wrap", { active: isActive })}>
          <div className={classNames("icon")} />
          <span>{name}</span>
        </div>
      </button>
      <style jsx>
        {`
          .tab_bar_icon_wrap {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            justify-items: center;
            transform: translateY(0px);
            transition: 0.3s ease;
          }
          .icon {
            mask-image: url("./images/${name}.svg");
            mask-size: 24px 24px;
            width: 24px;
            height: 24px;
            cursor: pointer;
            background-color: var(--green-40);
            transition: 0.3s ease;
          }
          .icon:not(.active):hover {
            background-color: var(--green-20);
          }
          span {
            position: absolute;
            opacity: 0;
            text-align: center;
            margin-bottom: -39px;
            color: var(--green-40);
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
            transition: 0.3s ease;
          }
          .active .icon {
            background-color: var(--trophy-gold);
            opacity: 1;
          }
          .tab_bar_icon_wrap:hover span,
          .active span {
            opacity: 1;
          }

          .tab_bar_icon_wrap:hover,
          .active {
            transform: translateY(-8px);
          }
          .active span {
            color: #d08e39;
          }
        `}
      </style>
    </>
  )
}

TabBarIcon.defaultProps = {
  isActive: false,
}
