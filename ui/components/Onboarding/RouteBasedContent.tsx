import React from "react"
import { useTranslation } from "react-i18next"
import { Route, Switch } from "react-router-dom"
import OnboardingRoutes from "../../pages/Onboarding/Tabbed/Routes"
import SharedButton from "../Shared/SharedButton"
import WalletShortcut from "./WalletShortcut"

export default function RouteBasedContent(): JSX.Element {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.routeBasedContent",
  })
  return (
    <Switch>
      <Route key={OnboardingRoutes.NEW_SEED} path={OnboardingRoutes.NEW_SEED}>
        <div className="fade_in">
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
      <Route
        key={OnboardingRoutes.ADD_WALLET}
        path={OnboardingRoutes.ADD_WALLET}
      >
        <div className="fade_in">{t("addWallet.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.VIEW_ONLY_WALLET}
        path={OnboardingRoutes.VIEW_ONLY_WALLET}
      >
        <div className="fade_in">{t("viewOnly.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.IMPORT_SEED}
        path={OnboardingRoutes.IMPORT_SEED}
      >
        <div className="fade_in">{t("importSeed.tip")}</div>
      </Route>
      <Route
        key={OnboardingRoutes.ONBOARDING_COMPLETE}
        path={OnboardingRoutes.ONBOARDING_COMPLETE}
      >
        <div className="fade_in">
          <WalletShortcut />
        </div>
      </Route>
      <Route>
        <div className="onboarding_facts fade_in">
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
