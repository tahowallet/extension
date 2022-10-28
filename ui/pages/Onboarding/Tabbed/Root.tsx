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
              ellipse at right top,
              rgba(36, 107, 103, 0.5) 0%,
              rgba(0, 20, 19, 1) 100%
            );
          }
          .right_container {
            position: relative;
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
            padding: 2em;
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
            padding: 1em 0;
          }
          .onboarding_chains {
            position: absolute;
            bottom: 140px;
            left: 0px;
            width: 100%;
            text-align: center;
          }
          .back_button button {
            background: var(--green-60);
            padding: 1em 0.75em;
            border-radius: 190px;
            font-size: 1em;
            margin: 2em;
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
          <img src="./images/onboarding/perks.svg" alt="Onboarding perks" />
        </div>
        <div className="onboarding_chains">
          <img
            src="./images/onboarding/supported_chains.png"
            alt="Supported chains"
          />
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
