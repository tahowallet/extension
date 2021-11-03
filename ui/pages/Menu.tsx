import React, { useState, ReactElement } from "react"
import classNames from "classnames"
import { useDispatch, useSelector } from "react-redux"
import {
  getHideDust,
  toggleHideDust,
} from "@tallyho/tally-background/redux-slices/accounts"
import CorePage from "../components/Core/CorePage"
import SharedButton from "../components/Shared/SharedButton"
import SharedToggleButton from "../components/Shared/SharedToggleButton"

function SettingRow(props: { title: string; action: any }): ReactElement {
  const { title, action } = props
  const dispatch = useDispatch()
  const hideDust = useSelector(getHideDust)

  const toggleHideDustAssets = () => {
    dispatch(toggleHideDust(!hideDust))
  }

  let actionFunction = () => {}
  let isHideDustSwitch = false
  if (title === "Hide asset balance under $2") {
    actionFunction = toggleHideDustAssets
    isHideDustSwitch = true
  }

  return (
    <li>
      <div className="left">{title}</div>
      <div className="right">
        {action(actionFunction, hideDust, isHideDustSwitch)}
      </div>
      <style jsx>
        {`
          li {
            height: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .left {
            color: var(--green-20);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
        `}
      </style>
    </li>
  )
}

function ArrowRightIcon() {
  return (
    <div className="icon_chevron_left">
      <style jsx>
        {`
          .icon_chevron_left {
            mask-image: url("./images/chevron_down.svg");
            mask-size: 15px 8px;
            width: 15px;
            height: 8px;
            margin-top: 2px;
            background-color: var(--green-40);
            transform: rotate(-90deg);
          }
        `}
      </style>
    </div>
  )
}

const settings = {
  general: [
    {
      title: "Main Currency",
      action: () => {
        return (
          <SharedButton size="medium" type="secondary" icon="chevron">
            USD
          </SharedButton>
        )
      },
    },
    {
      title: "Hide asset balance under $2",
      action: SharedToggleButton,
    },
    {
      title: "Use Tally as default wallet",
      action: SharedToggleButton,
    },
    {
      title: "Token list",
      action: ArrowRightIcon,
    },
  ],
  developer: [
    {
      title: "Show testnet networks",
      action: SharedToggleButton,
    },
    {
      title: "Contracts deployed by users",
      action: ArrowRightIcon,
    },
  ],
}

export default function Menu(): ReactElement {
  return (
    <>
      <CorePage hasTopBar={false}>
        <section className="standard_width_padded">
          <h1>Settings</h1>
          <div className="icon_lock" />
          <h3>General</h3>
          <ul>
            {settings.general.map((setting) => (
              <SettingRow title={setting.title} action={setting.action} />
            ))}
          </ul>
          <hr />
          <h3>Developer</h3>
          <ul>
            {settings.developer.map((setting) => (
              <SettingRow title={setting.title} action={setting.action} />
            ))}
          </ul>
        </section>
      </CorePage>
      <style jsx>
        {`
          h1 {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .icon_lock {
            background: url("./images/lock@2x.png");
            background-size: cover;
            width: 24px;
            height: 24px;
            position: absolute;
            top: 16px;
            right: 16px;
          }
          h3 {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          }
          hr {
            width: 100%;
            height: 1px;
            background-color: var(--green-80);
            border: unset;
            margin: 25px 0px 30px 0px;
          }
        `}
      </style>
    </>
  )
}
