import React, { ReactElement } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  selectHideDust,
  toggleHideDust,
} from "@tallyho/tally-background/redux-slices/ui"
import CorePage from "../components/Core/CorePage"
import SharedToggleButton from "../components/Shared/SharedToggleButton"

function SettingRow(props: {
  title: string
  component: () => ReactElement
}): ReactElement {
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

export default function Menu(): ReactElement {
  const dispatch = useDispatch()
  const hideDust = useSelector(selectHideDust)

  const toggleHideDustAssets = (toggleValue: boolean | undefined) => {
    dispatch(toggleHideDust(toggleValue))
  }
  const settings = {
    general: [
      {
        title: "Hide asset balance under $2",
        component: () => (
          <SharedToggleButton
            onChange={(toggleValue) => toggleHideDustAssets(toggleValue)}
            value={hideDust}
          />
        ),
      },
    ],
  }

  return (
    <>
      <CorePage hasTopBar={false}>
        <section className="standard_width_padded">
          <h1>Settings</h1>
          <ul>
            {settings.general.map((setting) => (
              <SettingRow title={setting.title} component={setting.component} />
            ))}
          </ul>
          <span>More settings are coming</span>
          <div className="community_cta_wrap">
            <h2 className="serif_header">Community release!</h2>
            <p>Join our discord to give us feedback!</p>
            <button
              type="button"
              aria-label="discord"
              className="mega_discord_chat_bubble_button"
              onClick={() => {
                window.open(`https://chat.tally.cash/`, "_blank")?.focus()
              }}
            />
          </div>
        </section>
      </CorePage>
      <style jsx>
        {`
          .community_cta_wrap {
            height: 344px;
            width: 384px;
            position: absolute;
            bottom: 0px;
            left: 0px;
            background-color: var(--green-95);
            text-align: center;
            padding-top: 24px;
            box-sizing: border-box;
          }
          h1 {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          h2 {
            font-size: 36px;
          }
          p {
            color: var(--green-20);
            text-align: center;
            font-size: 16px;
            margin-top: 6px;
          }
          span {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          }
          .mega_discord_chat_bubble_button {
            background: url("./images/tally_ho_chat_bubble@2x.png");
            background-size: cover;
            width: 266px;
            height: 120px;
            margin-top: 20px;
          }
          .mega_discord_chat_bubble_button:hover {
            opacity: 0.8;
          }
        `}
      </style>
    </>
  )
}
