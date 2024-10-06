import React, { useMemo } from "react"
import { Route, Switch, useRouteMatch, useHistory } from "react-router-dom"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import GridPlusCredentials from "./GridPlusCredentials"
import GridPlusPairingCode from "./GridPlusPairingCode"
import GridPlusImportAddresses from "./GridPlusImportAddresses"
import { useBackgroundDispatch } from "../../../../hooks"
import OnboardingRoutes from "../Routes"
import {
  GridPlusContextProps,
  GridPlusContext,
} from "../../../../utils/gridPlusHooks"

export default function GridPlus() {
  const { path } = useRouteMatch()
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  const gridPlusHandlers: GridPlusContextProps = useMemo(
    () => ({
      onSignedIn: (permitted) => {
        if (permitted) return history.push("/onboarding/grid-plus/addresses")
        return history.push("/onboarding/grid-plus/pairing")
      },
      onPaired: () => history.push("/onboarding/grid-plus/addresses"),
      onImported: () => {
        dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
        return history.push(OnboardingRoutes.ONBOARDING_COMPLETE)
      },
    }),
    [dispatch, history],
  )
  return (
    <GridPlusContext.Provider value={gridPlusHandlers}>
      <Switch>
        <Route exact path={path}>
          <GridPlusCredentials />
        </Route>
        <Route path={`${path}/pairing`}>
          <GridPlusPairingCode />
        </Route>
        <Route path={`${path}/addresses`}>
          <GridPlusImportAddresses />
        </Route>
      </Switch>
      <style jsx global>{`
        .form-container {
          padding-top: 8rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 24rem;
          margin: 0 auto;
          gap: 3rem;
          background: transparent;
        }

        header h1 {
          font-family: "Quincy CF";
          font-weight: 500;
          font-size: 36px;
          line-height: 42px;
          margin: 0;
        }
      `}</style>
    </GridPlusContext.Provider>
  )
}
