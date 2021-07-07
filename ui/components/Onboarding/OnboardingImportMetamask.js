import React from 'react';
import SharedButton from '../Shared/SharedButton';

function TextArea() {
  return (
    <>
      <textarea className="wrap center_horizontal"></textarea>
      <style jsx>{`
        textarea {
          width: 332px;
          height: 167px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          box-sizing: border-box;
        }
      `}</style>
    </>
  );
}

export default function OnboardingImportMetamask() {
  return (
    <section className="center_horizontal">
      <div className="portion top">
        <div className="metamask_onboarding_image"></div>
        <h1 className="serif_header">{`Metamask import`}</h1>
        <div className="info">
          Write down or copy paste the seed phrase from your Metamask account.
        </div>
        <TextArea />
      </div>
      <div className="portion bottom">
        <SharedButton size="medium" label="Import wallet" />
      </div>
      <style jsx>{`
        section {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }
        h1 {
          margin: unset;
        }
        .portion {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bottom {
          height: 80px;
        }
        .metamask_onboarding_image {
          background: url('./images/onboarding_metamask@2x.png');
          background-size: cover;
          width: 284px;
          height: 112px;
          margin-top: 27px;
          margin-bottom: 13px;
        }
        .info {
          width: 313px;
          height: 43px;
          color: var(--green-60);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          text-align: center;
          margin-bottom: 32px;
        }
      `}</style>
    </section>
  );
}
