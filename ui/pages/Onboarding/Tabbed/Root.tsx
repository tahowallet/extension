import React, { ReactElement, useEffect, useState } from "react"

import { Route, Switch, matchPath, useLocation } from "react-router-dom"

import { useTranslation } from "react-i18next"
import browser from "webextension-polyfill"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"

import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import SharedBackButton from "../../../components/Shared/SharedBackButton"
import AddWallet from "./AddWallet"
import Done from "./Done"
import ImportSeed from "./ImportSeed"
import SetPassword from "./SetPassword"
import NewSeed, { NewSeedRoutes } from "./NewSeed"
import InfoIntro from "./Intro"
import ViewOnlyWallet from "./ViewOnlyWallet"
import Ledger from "./Ledger/Ledger"

import SharedButton from "../../../components/Shared/SharedButton"
import OnboardingRoutes from "./Routes"
import ImportPrivateKey from "./ImportPrivateKey"

// @TODO Rethink what networks we show once custom networks are supported
const productionNetworks = [
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
]

const getNetworkIcon = (networkName: string) => {
  const icon = networkName.replaceAll(" ", "").toLowerCase()

  return `/images/networks/${icon}@2x.png`
}

/**
 * Renders a list of production network icons
 */
function SupportedChains(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "onboarding" })
  return (
    <div className="supported_chains">
      <span>{t("supportedChains")}</span>
      <div className="chain_logos">
        {productionNetworks.map((network) => (
          <img
            width="24"
            height="24"
            key={network.chainID}
            src={getNetworkIcon(network.name)}
            alt={network.name}
          />
        ))}
      </div>
      <style jsx>{`
        .supported_chains {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .supported_chains span {
          font-size: 12px;
          line-height: 16px;
          color: var(--green-40);
        }

        .chain_logos {
          display: flex;
          gap: 10px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}

const WalletShortcut = () => {
  const [os, setOS] = useState("windows")

  // fetch the OS using the extension API to decide what shortcut to show
  useEffect(() => {
    let active = true

    async function loadOS() {
      if (active) {
        setOS((await browser.runtime.getPlatformInfo()).os)
      }
    }

    loadOS()

    return () => {
      active = false
    }
  }, [])

  // state for alt, t, and option key status
  const [tPressed, setTPressed] = useState(false)
  const [altPressed, setAltPressed] = useState(false)

  // add keydown/up listeners for our shortcut code
  useEffect(() => {
    const downListener = (e: KeyboardEvent) => {
      if (e.altKey || e.key === "Alt") {
        setAltPressed(true)
      }
      if (e.key === "t") {
        setTPressed(true)
      }
    }
    const upListener = (e: KeyboardEvent) => {
      if (e.altKey || e.key === "Alt") {
        setAltPressed(false)
      }
      if (e.key === "t") {
        setTPressed(false)
      }
    }

    window.addEventListener("keydown", downListener.bind(window))
    window.addEventListener("keyup", upListener.bind(window))

    return () => {
      window.removeEventListener("keydown", downListener)
      window.removeEventListener("keyup", upListener)
    }
  })
  return (
    <div className="wallet_shortcut">
      <span>
        Did you know that you can open Taho using a keyboard shortcut?
      </span>
      <img
        height="38"
        className="indicator"
        src={
          os === "mac"
            ? `/images/mac-shortcut${altPressed ? "-option" : ""}${
                tPressed ? "-t" : ""
              }.svg`
            : `/images/windows-shortcut${altPressed ? "-alt" : ""}${
                tPressed ? "-t" : ""
              }.svg`
        }
        alt={os === "mac" ? "option + T" : "alt + T"}
      />
      <style jsx>{`
        .wallet_shortcut {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }

        .wallet_shortcut > span {
          text-align: center;
        }
      `}</style>
    </div>
  )
}

function RouteBasedContent() {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.routeBasedContent",
  })
  return (
    <Switch>
      <Route key={OnboardingRoutes.NEW_SEED} path={OnboardingRoutes.NEW_SEED}>
        <div className="fadeIn">
          {t("newSeed.tip")}
          <SharedButton
            type="secondary"
            size="medium"
            linkTo={OnboardingRoutes.VIEW_ONLY_WALLET}
          >
            {t("newSeed.action")}
          </SharedButton>
        </div>
        <style jsx>{`
          div {
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
          }
        `}</style>
      </Route>
      <Route key={OnboardingRoutes.LEDGER} path={OnboardingRoutes.LEDGER}>
        <div className="fadeIn">
          {t("ledger.tip")}
          <a target="_blank" href={WEBSITE_ORIGIN} rel="noreferrer">
            {t("ledger.action")}
          </a>
        </div>
        <style jsx>{`
          a {
            color: var(--trophy-gold);
          }
        `}</style>
      </Route>
      <Route
        key={OnboardingRoutes.ADD_WALLET}
        path={OnboardingRoutes.ADD_WALLET}
      >
        <div className="fadeIn">{t("addWallet.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.VIEW_ONLY_WALLET}
        path={OnboardingRoutes.VIEW_ONLY_WALLET}
      >
        <div className="fadeIn">{t("viewOnly.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.IMPORT_SEED}
        path={OnboardingRoutes.IMPORT_SEED}
      >
        <div className="fadeIn">{t("importSeed.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.IMPORT_PRIVATE_KEY}
        path={OnboardingRoutes.IMPORT_PRIVATE_KEY}
      >
        <div className="fadeIn">{t("importSeed.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.ONBOARDING_COMPLETE}
        path={OnboardingRoutes.ONBOARDING_COMPLETE}
      >
        <div className="fadeIn">
          <WalletShortcut />
        </div>
      </Route>
      <Route>
        <div className="onboarding_facts fadeIn">
          <p>{t("default.fact1")}</p>
          <p>{t("default.fact2")}</p>
          <p>{t("default.fact3")}</p>
          <style jsx>
            {`
              .onboarding_facts {
                color: var(--green-20);
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 24px;
              }

              .onboarding_facts p {
                margin: 0;
                text-align: left;
                font-size: 18px;
                line-height: 24px;
              }

              .onboarding_facts p::before {
                content: url("./images/check.svg");
                width: 16px;
                height: 16px;
                margin-right: 16px;
              }
            `}
          </style>
        </div>
      </Route>
    </Switch>
  )
}

function Navigation({ children }: { children: React.ReactNode }): ReactElement {
  const location = useLocation()
  return (
    <section className="onboarding_container">
      <style jsx>
        {`
          section {
            width: 100%;
            display: flex;
            height: 100%;
            width: 100%;
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

          .right_container {
            position: relative;
            padding: 62px 80px 0;
            width: 50%;
            height: 100%;
            box-sizing: border-box;
            background: #04141480;
            overflow-y: hidden;
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
        <div className="route_based_content">
          <RouteBasedContent />
        </div>
        <div className="supported_chains_container">
          <SupportedChains />
        </div>
      </div>
      <div className="right_container">
        {!matchPath(location.pathname, {
          path: [
            OnboardingRoutes.ONBOARDING_START,
            OnboardingRoutes.ONBOARDING_COMPLETE,
            NewSeedRoutes.VERIFY_SEED,
          ],
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
  return (
    <Navigation>
      <Switch>
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
          <ImportPrivateKey nextPage={OnboardingRoutes.ONBOARDING_COMPLETE} />
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
