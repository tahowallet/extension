import React, { ReactElement } from "react"

import { useRouteMatch, Route, Switch } from "react-router-dom"

import SharedBackButton from "../../../components/Shared/SharedBackButton"
import AddWallet from "./AddWallet"
import Done from "./Done"
import ImportSeed from "./ImportSeed"
import SetPassword from "./SetPassword"
import SaveSeed from "./SaveSeed"
import VerifySeed from "./VerifySeed"
import InfoIntro from "./Intro"
import ViewOnlyWallet from "./ViewOnlyWallet"
import Ledger from "./Ledger"

type Props = {
  children: ReactElement
}

function Navigation({ children }: Props): ReactElement {
  return (
    <section className="onboarding_container">
      <style jsx>
        {`
          section {
            width: 100%;
          }
          .left_container {
            position: relative;
            width: 50%;
            height: 100%;
            float: left;
            text-align: center;
            padding-top: 3em;
            background: radial-gradient(
              circle,
              rgba(36, 107, 103, 1) 0%,
              rgba(12, 47, 44, 1) 50%,
              rgba(4, 20, 20, 1) 100%
            );
            background-size: 140% 200%;
            animation: gradient 20s ease infinite;
          }
          .right_container {
            position: relative;
            padding-top: 80px;
            width: 50%;
            height: 100%;
            float: right;
            background: radial-gradient(
              ellipse at right bottom,
              rgba(36, 107, 103, 0.15) 0%,
              var(--green-120) 100%
            );
          }
          .top {
            display: flex;
            justify-content: space-between;
            width: 100%;
            padding: 3em 6em;
            position: absolute;
            z-index: 999;
          }
          .onboarding_container {
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          .onboarding_branding {
            width: 100%;
            max-width: 300px;
            padding: 3em 0;
            border-bottom: 1px solid black;
            margin: 2em auto;
          }
          .onboarding_branding img {
            max-width: 100%;
          }
          .onboarding_facts {
            width: 100%;
            max-width: 300px;
            margin: auto;
            padding: 1em 0;
          }
          .onboarding_facts p {
            text-align: left;
            font-size: 18px;
            margin: 25px 0;
          }
          .onboarding_facts p::before {
            content: url("./images/check.svg");
            width: 15px;
            height: 15px;
            padding: 15px;
          }
          .onboarding_chains {
            position: absolute;
            bottom: 140px;
            left: 0px;
            width: 100%;
            text-align: center;
            opacity: 0.8;
          }
          .onboarding_chains p {
            font-size: 12px;
          }
          .onboarding_chains img {
            display: inline-block;
            height: 25px;
            margin: 10px;
          }
          .back_button button {
            background: var(--green-60);
            padding: 1em 0.75em;
            border-radius: 190px;
            font-size: 1em;
            margin: 2em;
          }
          @keyframes gradient {
            0% {
              background-position: 100% 100%;
            }
            50% {
              background-position: 25% 50%;
            }
            100% {
              background-position: 100% 100%;
            }
          }
          @media (max-width: 980px) {
            .left_container {
              display: none;
            }
            .right_container {
              width: 100%;
            }
          }
        `}
      </style>
      <div className="left_container">
        <div className="onboarding_branding">
          <img src="./images/logo_onboarding.svg" alt="Onboarding logo" />
        </div>
        <div className="onboarding_facts">
          <p>Fully owned by the community</p>
          <p>Accessible to everyone</p>
          <p>100% open source</p>
        </div>
        <div className="onboarding_chains">
          <p>Supported Chains</p>
          <img src="./images/eth@2x.png" alt="Ethereum" />
          <img src="./images/optimism@2x.png" alt="Optimism" />
          <img src="./images/arbitrum@2x.png" alt="Arbitrum One" />
          <img src="./images/polygon@2x.png" alt="Polygon Mainnet" />
        </div>
      </div>
      <div className="right_container">
        <div className="top back_button">
          <SharedBackButton withoutBackText />
        </div>
        {children}
      </div>
    </section>
  )
}

export default function Root(): ReactElement {
  const { path } = useRouteMatch()

  return (
    <Navigation>
      <Switch>
        <Route path={`${path}`} exact>
          <InfoIntro />
        </Route>
        <Route path={`${path}/add-wallet`}>
          <AddWallet />
        </Route>
        <Route path={`${path}/ledger`}>
          <Ledger />
        </Route>
        <Route path={`${path}/import-seed/set-password`}>
          <SetPassword nextPage={`${path}/import-seed`} />
        </Route>
        <Route path={`${path}/import-seed`}>
          <ImportSeed nextPage={`${path}/done`} />
        </Route>
        <Route path={`${path}/new-seed/set-password`}>
          <SetPassword nextPage={`${path}/new-seed`} />
        </Route>
        <Route path={`${path}/new-seed/verify`}>
          <VerifySeed nextPage={`${path}/done`} />
        </Route>
        <Route path={`${path}/new-seed`}>
          <SaveSeed />
        </Route>
        <Route path={`${path}/view-only-wallet`}>
          <ViewOnlyWallet />
        </Route>
        <Route path={`${path}/done`}>
          <Done />
        </Route>
      </Switch>
    </Navigation>
  )
}
