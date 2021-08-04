import React from "react"
import PropTypes from "prop-types"
import SharedTooltip from "../Shared/SharedTooltip"
import SharedButton from "../Shared/SharedButton"

export default function OnboardingStartTheHunt(props) {
  const { openNewWalletScreen, openMetamaskImportScreen } = props

  return (
    <section className="start_wrap">
      <div className="mascot" />
      <h1 className="serif_header">Start the hunt</h1>
      <div className="subtitle subtitle_hunt">
        Let&apos;s set Tally up with a wallet. Select with what wallet you would
        like to continue.
      </div>
      <ul>
        <li className="label">Use an existing wallet</li>
        <li className="option standard_width">
          <div className="icon metamask_icon" />
          <SharedButton
            type="tertiary"
            label="Import Metamask"
            icon="chevron_right"
            onClick={openMetamaskImportScreen}
          />
        </li>
        <li className="option standard_width">
          <div className="icon trezor_icon" />
          <SharedButton
            type="tertiary"
            label="Connect hardware wallet"
            icon="chevron_right"
          />
        </li>
        <li className="label">
          Start Fresh
          <SharedTooltip>
            Create a n ew wallet that you own the private keys for. You will
            need to save the recovery seed to keep it safe.
          </SharedTooltip>
        </li>
        <li className="option standard_width">
          <div className="icon tally_icon" />
          <SharedButton
            type="secondary"
            label="Create new wallet"
            onClick={openNewWalletScreen}
          />
        </li>
      </ul>
      <style jsx>
        {`
          section {
            padding-top: 25px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .title {
            margin-top: 23px;
            font-size: 36px;
            margin-bottom: 14px;
          }
          .subtitle {
            color: var(--green-60);
            margin-bottom: 32px;
          }
          .subtitle_hunt {
            width: 307px;
            text-align: center;
            line-height: 24px;
          }
          .label {
            margin-bottom: 16px;
            display: block;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            display: flex;
            align-items: center;
          }
          .option {
            display: flex;
            height: 64px;
            border-radius: 16px;
            background-color: var(--green-95);
            align-items: center;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 24px;
            justify-content: space-between;
          }
          .mascot {
            background: url("./images/mascot@2x.png");
            background-size: cover;
            width: 82px;
            height: 78px;
          }
          .icon {
            width: 36px;
            height: 36px;
          }
          .trezor_icon {
            background: url("./images/trezor_icon@2x.png");
            background-size: cover;
          }
          .tally_icon {
            background: url("./images/tally_circle_icon@2x.png");
            background-size: cover;
          }
          .metamask_icon {
            background: url("./images/metamask_icon@2x.png");
            background-size: cover;
          }
        `}
      </style>
    </section>
  )
}

OnboardingStartTheHunt.propTypes = {
  openNewWalletScreen: PropTypes.func.isRequired,
  openMetamaskImportScreen: PropTypes.func.isRequired,
}
