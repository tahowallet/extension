import React, { ReactElement } from "react"

export default function Done(): ReactElement {
  return (
    <section>
      <div className="confetti">
        <img src="./images/confetti.svg" alt="Confetti" />
      </div>
      <div className="wrapper fadeIn">
        <header>
          <img
            width="80"
            height="80"
            alt="Tally Ho Gold"
            src="./images/doggo_gold.svg"
            className="illustration"
          />
          <div>
            <h1>Welcome to TallyHo!</h1>
            <span>
              For faster access we recommend pinning Tally&nbsp;Ho to your
              browser
            </span>
          </div>
        </header>
        <img
          width="383"
          src="./images/onboarding_pin_extension.gif"
          alt="Pin the wallet"
        />
      </div>

      <style jsx>{`
        section {
          text-align: center;
        }
        header {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          margin-bottom: 32px;
        }

        header div {
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 12 px;
        }

        header h1 {
          display: inline-block;
          font-family: "Quincy CF";
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          margin: 0;
          color: var(--white);
        }

        header span {
          font-family: "Segment";
          font-style: normal;
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }

        header img {
          border-radius: 22px;
        }

        .wrapper {
          position: relative;
          z-index: 1;
        }

        .wallet_shortcut {
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          align-items: center;
          padding: 16px;
          height: 158px;
          border-radius: 16px;
          background-color: var(--hunter-green);
          color: var(--green-40);
          margin-top: 24px;
        }

        .wallet_shortcut > span {
          text-align: center;
        }
        .confetti {
          position: absolute;
          display: none;
          opacity: 0.7;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </section>
  )
}
