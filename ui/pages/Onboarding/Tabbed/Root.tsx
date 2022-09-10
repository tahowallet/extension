import React, { ReactElement } from "react"

import { useRouteMatch, Route, Switch } from "react-router-dom"

import AddWallet from "./AddWallet"
import Done from "./Done"
import ImportSeed from "./ImportSeed"
import SetPassword from "./SetPassword"
import SaveSeed from "./SaveSeed"
import VerifySeed from "./VerifySeed"
import InfoIntro from "./Intro"
import ViewOnlyWallet from "./ViewOnlyWallet"

export default function Root(): ReactElement {
  const { path } = useRouteMatch()

  return (
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
      <Route path={`${path}/new-seed`}>
        <SaveSeed />
      </Route>
      <Route path={`${path}/new-seed/verify`}>
        <VerifySeed />
      </Route>
      <Route path={`${path}/view-only-wallet`}>
        <ViewOnlyWallet />
      </Route>
      <Route path={`${path}/done`}>
        <Done />
      </Route>
    </Switch>
  )
}
