import React, { useState } from 'react';
import OnboardingImportMetamask from '../components/Onboarding/OnboardingImportMetamask';
import SharedButton from '../components/Shared/SharedButton';
import SharedInput from '../components/Shared/SharedInput';
import { registerRoute } from '../config/routes';

function NewPassword() {
  return (
    <section>
      <h1 className="serif_header">Good hunting.</h1>
      <div className="subtitle">The decentralized web awaits.</div>
      <SharedInput placeholder="Password" />
      <SharedInput placeholder="Repeat Password" />
      <SharedButton type="primary" size="medium" label="Begin the hunt" />
      <SharedButton type="tertiary" size="medium" label="Restoring account?" />
    </section>
  );
}

function OnboardingStepsIndicator(props) {
  const { activeStep } = props;

  return (
    <ul>
      <li>Create</li>
      <li>Save</li>
      <li>Verify</li>
      <style jsx>{`
        li:before {
          content: '';
          width: 16px;
          height: 6px;
          border-radius: 100px;
          background-color: var(--trophy-gold);
        }
        li {
          display: block;
          color: var(--trophy-gold);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          text-align: center;
        }
      `}</style>
    </ul>
  );
}

function VerifySeed() {
  
  handleClick() {
    // Trigger select
  }
  
  return (
    <section>
      <OnboardingStepsIndicator />
      <h1 className="serif_header">Verify recovery seed</h1>
      <div className="subtitle">
        Click on the orange words in the order that you wrote down your seed
      </div>
      <>
        {['', '', '', '', ''].map(() => {
          return (<SharedButton
            type="primary"
            size="medium"
            label="desk"
            onClick={handleClick}
          />)
        })}
      </>
      <>
        {['', '', '', '', ''].map(() => {
          return (<SharedButton
            type="secondary"
            size="medium"
            label="desk"
            onClick={handleClick}
          />)
        })}
      </>
    </section>
  );
}

function SaveSeed() {
  return (
    <section>
      <OnboardingStepsIndicator />
      <h1 className="serif_header">Save and store your recovery seed</h1>
      <div className="subtitle">
        This is the only way to restore your tally wallett
      </div>
      <div className="words_group">
        <div className="column_wrap">
          <div className="column numbers">1 2 3 4 5 6</div>
          <div className="column dashes">- - - - - -</div>
          <div className="column words">hub plum catering desk mouse cap</div>
        </div>
        <div className="column_wrap">
          <div className="column numbers">1 2 3 4 5 6</div>
          <div className="column dashes">- - - - - -</div>
          <div className="column words">hub plum catering desk mouse cap</div>
        </div>
      </div>
      <SharedButton
        type="primary"
        size="medium"
        label="I wrote it down, verify recovery seed"
        icon="arrow_right"
        iconSize="large"
      />
      <SharedButton
        type="secondary"
        size="medium"
        label="Copy and verify recovery seed"
        icon="arrow_right"
        iconSize="large"
      />
      <style jsx>
        {`
          .words_group {
            display: flex;
            width: 232px;
            justify-content: space-between;
          }
          .numbers {
            width: 12px;
          }
          .dashes {
            width: 12px;
          }
          .words {
            width: 69px;
          }
          .column {
            height: 142px;
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: right;
          }
          .column_wrap {
            display: flex;
          }
          .dashes {
            margin-right: 8px;
            margin-left: 5px;
          }
          .words {
            text-align: left;
          }
        `}
      </style>
    </section>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);

  return (
    <>
      <SaveSeed triggerNextStep={() => {
        setStep(step + 1)
      }}/>
    </>
  );
}

registerRoute('onboarding', Onboarding);
