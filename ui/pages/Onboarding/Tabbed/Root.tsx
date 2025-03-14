import React, { ReactElement, useState } from "react"

import {
  Route,
  Switch,
  matchPath,
  useLocation,
  Redirect,
} from "react-router-dom"

import classNames from "classnames"
import { demoSetInstallid } from "@tallyho/tally-background/redux-slices/ui"

import SharedBackButton from "../../../components/Shared/SharedBackButton"
import AddWallet from "./AddWallet"
import Done from "./Done"
import ImportSeed from "./ImportSeed"
import SetPassword from "./SetPassword"
import NewSeed, { NewSeedRoutes } from "./NewSeed"
import InfoIntro from "./Intro"
import ViewOnlyWallet from "./ViewOnlyWallet"
import Ledger from "./Ledger/Ledger"
import OnboardingRoutes from "./Routes"
import RouteBasedContent from "../../../components/Onboarding/RouteBasedContent"
import { useBackgroundDispatch, useIsOnboarding } from "../../../hooks"
import ImportPrivateKeyForm from "./ImportPrivateKeyForm"

function Navigation({
  children,
  isOnboarding,
}: {
  children: React.ReactNode
  isOnboarding: boolean
}): ReactElement {
  const location = useLocation()

  const ROUTES_WITHOUT_BACK_BUTTON = [
    OnboardingRoutes.ONBOARDING_START,
    OnboardingRoutes.ONBOARDING_COMPLETE,
    NewSeedRoutes.VERIFY_SEED,
    !isOnboarding && OnboardingRoutes.ADD_WALLET,
  ].filter((path): path is Exclude<typeof path, false> => !!path)

  const dispatch = useBackgroundDispatch()

  return (
    <section className="onboarding_container">
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          border: "1px dashed white",
          padding: 4,
          zIndex: 10000,
        }}
      >
        <textarea
          style={{
            background: "white",
            color: "black",
            fontSize: "small",
            width: 350,
          }}
          id="installId"
          placeholder="put install id here"
        />
        <button
          type="button"
          style={{
            border: "1px solid red",
            borderRadius: 4,
            padding: "8px 4px",
          }}
          onClick={() => {
            const textArea: HTMLTextAreaElement | null =
              document.getElementById("installId") as HTMLTextAreaElement

            if (textArea) {
              dispatch(demoSetInstallid(textArea.value.trim())).then(() =>
                // eslint-disable-next-line no-alert
                alert("done!"),
              )
            }
          }}
        >
          change install id
        </button>
      </div>
      <style jsx>
        {`
          section {
            width: 100%;
            display: flex;
            height: 100%;
            width: 100%;
            justify-content: center;
          }

          .left_container {
            position: relative;
            width: 50%;
            padding-top: 80px;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow-y: hidden;
            box-sizing: border-box;
          }

          .left_container.hide {
            display: none;
          }

          .right_container {
            position: relative;
            display: flex
            flex-direction: row;
            padding: 42px 80px 0;
            width: 50%;
            height: 100%;
            box-sizing: border-box;
            background: #04141480;
            overflow-y: auto;
          }

          .route_based_content {
            max-width: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-grow: 1;
            font-family: "Segment";
            font-style: normal;
            font-weight: 400;
            font-size: 18px;
            line-height: 24px;
            color: var(--green-20);
            text-align: center;
          }

          .onboarding_branding {
            width: 100%;
            max-width: 300px;
            padding-bottom: 44px;
            border-bottom: 1px solid var(--green-120);
            margin: 0 auto 38px;
          }

          .supported_chains_container {
            margin-top: auto;
            margin-bottom: 40px;
          }

          @media (max-width: 1000px) {
            .left_container {
              display: none;
            }
            .right_container {
              width: 100%;
            }
          }
        `}
      </style>
      <div className={classNames("left_container", { hide: !isOnboarding })}>
        <div className="onboarding_branding">
          <img src="./images/logo_onboarding.svg" alt="Onboarding logo" />
        </div>
        <div className="route_based_content">
          <RouteBasedContent />
        </div>
      </div>
      <div className="right_container">
        {!matchPath(location.pathname, {
          path: ROUTES_WITHOUT_BACK_BUTTON,
          exact: true,
        }) && (
          <div className="back_button">
            <SharedBackButton withoutBackText round />
          </div>
        )}
        {children}
      </div>
      <style jsx>{`
        .back_button {
          position: absolute;
          margin-top: 20px;
          z-index: 1;
        }
      `}</style>
    </section>
  )
}

export default function Root(): ReactElement {
  // This prevents navigation "Onboarding" state from changing
  // until this component is unmounted
  const [isOnboarding] = useState(useIsOnboarding())

  return (
    <Navigation isOnboarding={isOnboarding}>
      <Switch>
        {!isOnboarding && (
          <Redirect
            to={OnboardingRoutes.ADD_WALLET}
            from={OnboardingRoutes.ONBOARDING_START}
            exact
          />
        )}
        <Route path={OnboardingRoutes.ONBOARDING_START} exact>
          <InfoIntro />
        </Route>
        <Route path={OnboardingRoutes.ADD_WALLET}>
          <AddWallet />
        </Route>
        <Route path={OnboardingRoutes.LEDGER}>
          <Ledger />
        </Route>
        <Route path={OnboardingRoutes.SET_PASSWORD}>
          <SetPassword />
        </Route>
        <Route path={OnboardingRoutes.IMPORT_SEED}>
          <ImportSeed nextPage={OnboardingRoutes.ONBOARDING_COMPLETE} />
        </Route>
        <Route path={OnboardingRoutes.IMPORT_PRIVATE_KEY}>
          <ImportPrivateKeyForm
            nextPage={OnboardingRoutes.ONBOARDING_COMPLETE}
          />
        </Route>
        <Route path={OnboardingRoutes.NEW_SEED}>
          <NewSeed />
        </Route>
        <Route path={OnboardingRoutes.VIEW_ONLY_WALLET}>
          <ViewOnlyWallet />
        </Route>
        <Route path={OnboardingRoutes.ONBOARDING_COMPLETE}>
          <Done />
        </Route>
      </Switch>
    </Navigation>
  )
}
