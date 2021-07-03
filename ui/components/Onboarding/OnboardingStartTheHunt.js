import React from 'react';
import PropTypes from 'prop-types';
import SharedTooltip from '../Shared/SharedTooltip';
import SharedButton from '../Shared/SharedButton';

export default function OnboardingStartTheHunt(props) {
  const { openNewWalletScreen, openMetamaskImportScreen } = props;

  return (
    <section className="start_wrap">
      <div className="mascot" />
      <h1 className="serif_header">Start the hunt</h1>
      <div className="subtitle subtitle_hunt">
        Let's set Tally up with a wallet. Select with what wallet you would like
        to continue.
      </div>
      <ul>
        <li className="label">Use an existing wallet</li>
        <li className="option">
          <SharedButton
            type="tertiary"
            label="Import Metamask"
            icon="chevron_right"
            onClick={openMetamaskImportScreen}
          />
        </li>
        <li className="option">
          <SharedButton
            type="tertiary"
            label="Connect hardware wallet"
            icon="chevron_right"
          />
        </li>
        <li className="label">
          Start Fresh
          <SharedTooltip label="Create a new wallet that you own the private keys for. You will need to save the recovery seed to keep it safe." />
        </li>
        <li className="option">
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
            width: 352px;
            height: 64px;
            border-radius: 16px;
            background-color: var(--green-95);
            align-items: center;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 24px;
          }
          .mascot {
            background: url('./images/mascot@2x.png');
            background-size: cover;
            width: 82px;
            height: 78px;
          }
        `}
      </style>
    </section>
  );
}

OnboardingStartTheHunt.propTypes = {
  openNewWalletScreen: PropTypes.func.isRequired,
  openMetamaskImportScreen: PropTypes.func.isRequired,
};
