import React, { ReactElement } from "react"

import { useRouteMatch, Route, Switch } from "react-router-dom"

import SharedBackButton from "../../../components/Shared/SharedBackButton"
import { OnboardingContainer } from "../styles"
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
    <section className="standard_width onboarding_container">
      <div className="top">
        <SharedBackButton />
      </div>
      {children}
      <style jsx>
        {`
          section {
            padding-top: 25px;
          }
          .top {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 40px;
          }
          .onboarding_container {
            ${OnboardingContainer}
          }
        `}
      </style>
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
