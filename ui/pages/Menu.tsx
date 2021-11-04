import React, { useState, ReactElement } from "react"
import classNames from "classnames"
import { useDispatch, useSelector } from "react-redux"
import {
  selectHideDust,
  toggleHideDust,
} from "@tallyho/tally-background/redux-slices/ui"
import CorePage from "../components/Core/CorePage"
import SharedButton from "../components/Shared/SharedButton"
import SharedToggleButton from "../components/Shared/SharedToggleButton"

function SettingRow(props: { title: string; component: any }): ReactElement {
  const { title, component } = props

  return (
    <li>
      <div className="left">{title}</div>
      <div className="right">{component()}</div>
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

export default function Menu(): ReactElement {
  const dispatch = useDispatch()
  const hideDust = useSelector(selectHideDust)

  const toggleHideDustAssets = () => {
    dispatch(toggleHideDust(!hideDust))
  }
  const settings = {
    general: [
      {
        title: "Main Currency",
        component: () => {
          return (
            <SharedButton size="medium" type="secondary" icon="chevron">
              USD
            </SharedButton>
          )
        },
      },
      {
        title: "Hide asset balance under $2",
        component: () => {
          return (
            <SharedToggleButton
              onChange={toggleHideDustAssets}
              value={hideDust}
            />
          )
        },
      },
      {
        title: "Use Tally as default wallet",
        component: () => {
          return <SharedToggleButton onChange={() => {}} />
        },
      },
      {
        title: "Token list",
        component: ArrowRightIcon,
      },
    ],
    developer: [
      {
        title: "Show testnet networks",
        component: () => {
          return <SharedToggleButton onChange={() => {}} />
        },
      },
      {
        title: "Contracts deployed by users",
        component: ArrowRightIcon,
      },
    ],
  }

  return (
    <>
      <CorePage hasTopBar={false}>
        <section className="standard_width_padded">
          <h1>Settings</h1>
          <div className="icon_lock" />
          <h3>General</h3>
          <ul>
            {settings.general.map((setting) => (
              <SettingRow title={setting.title} component={setting.component} />
            ))}
          </ul>
          <hr />
          <h3>Developer</h3>
          <ul>
            {settings.developer.map((setting) => (
              <SettingRow title={setting.title} component={setting.component} />
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
