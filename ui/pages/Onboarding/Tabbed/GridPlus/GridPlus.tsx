import React from "react"
import { Route, Switch, useRouteMatch, useHistory } from "react-router-dom"
import GridPlusCredentials from "./GridPlusCredentials"
import GridPlusPairingCode from "./GridPlusPairingCode"
import GridPlusImportAddresses from "./GridPlusImportAddresses"

type GridPlusContextProps = {
  onSignedIn: (permitted: boolean) => void
  onPaired: () => void
}

const GridPlusContext = React.createContext<GridPlusContextProps | undefined>(
  undefined,
)
export const useGridPlus = () =>
  React.useContext<GridPlusContextProps>(GridPlusContext as never)

export default function GridPlus() {
  const { path } = useRouteMatch()
  const history = useHistory()
  const gridPlusHandlers: GridPlusContextProps = {
    onSignedIn: (permitted) => {
      if (permitted) return history.push("/onboarding/gridplus/addresses")
      history.push("/onboarding/gridplus/pairing")
    },
    onPaired: () => history.push("/onboarding/gridplus/addresses"),
  }
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
