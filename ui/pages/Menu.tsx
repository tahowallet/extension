import React, { ReactElement } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
  selectHideDust,
  toggleHideDust,
} from "@tallyho/tally-background/redux-slices/ui"
import SharedButton from "../components/Shared/SharedButton"
import SharedIcon from "../components/Shared/SharedIcon"
import SharedToggleButton from "../components/Shared/SharedToggleButton"
import t from "../utils/i18n"

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
  const defaultWallet = useSelector(selectDefaultWallet)

  const toggleHideDustAssets = (toggleValue: boolean) => {
    dispatch(toggleHideDust(toggleValue))
  }
  const toggleDefaultWallet = (defaultWalletValue: boolean) => {
    dispatch(setNewDefaultWalletValue(defaultWalletValue))
  }
  const settings = {
    general: [
      {
        title: t("menuHideSmallAssetBalance", "2"),
        component: () => (
          <SharedToggleButton
            onChange={(toggleValue) => toggleHideDustAssets(toggleValue)}
            value={hideDust}
          />
        ),
      },
      {
        title: t("menuSetAsDefault"),
        component: () => (
          <SharedToggleButton
            onChange={(toggleValue) => toggleDefaultWallet(toggleValue)}
            value={defaultWallet}
          />
        ),
      },
      {
        title: "",
        component: () => (
          <SharedButton
            type="unstyled"
            size="medium"
            linkTo="/menu/export-logs"
          >
            <div className="bug_report_row">
              <div className="action_name">Bug report</div>
              <SharedIcon
                icon="icons/s/continue.svg"
                width={16}
                color="var(--green-20)"
                ariaLabel="Open bug report"
              />
              <style jsx>{`
                .action_name {
                  color: var(--green-20);
                  font-size: 18px;
                  font-weight: 600;
                  line-height: 24px;
                }
                .bug_report_row {
                  width: 336px;
                  align-items: center;
                  justify-content: space-between;
                  align-content: center;
                  display: flex;
                }
                .bug_report_row:hover > .action_name {
                  color: var(--green-5);
                }
              `}</style>
            </div>
          </SharedButton>
        ),
      },
    ],
  }

  return (
    <>
      <section className="standard_width_padded">
        <h1>Main menu</h1>
        <ul>
          {settings.general.map((setting) => (
            <SettingRow
              key={setting.title}
              title={setting.title}
              component={setting.component}
            />
          ))}
        </ul>
        <div className="community_cta_wrap">
          <h2>Join our community</h2>
          <p>Join our discord to give us feedback!</p>
          <SharedButton
            type="primary"
            size="large"
            iconMedium="discord"
            iconPosition="left"
            onClick={() => {
              window.open(`https://chat.tally.cash/`, "_blank")?.focus()
            }}
          >
            Join and give feedback
          </SharedButton>
        </div>
        <div className="version">
          Version: {process.env.VERSION ?? `<unknown>`}
        </div>
      </section>
      <style jsx>
        {`
          section {
            display: flex;
            flex-flow: column;
            height: 544px;
            background-color: var(--hunter-green);
          }
          .community_cta_wrap {
            width: 100vw;
            margin-top: auto;
            margin-left: -21px;
            background-color: var(--green-95);
            text-align: center;
            padding: 24px 0px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h1 {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            margin-bottom: 5px;
          }
          h2 {
            font-weight: 500;
            font-size: 22px;
            padding: 0px;
            margin: 0px 0px -1px 0px;
          }
          p {
            color: var(--green-20);
            text-align: center;
            font-size: 16px;
            margin-top: 6px;
            margin-bottom: 24px;
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
          .version {
            margin: 16px 0;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            margin: 0 auto;
            padding: 16px 0px;
          }
        `}
      </style>
    </>
  )
}
