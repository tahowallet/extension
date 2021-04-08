import { HashRouter } from 'react-router-dom'

import { I18nProvider, LegacyI18nProvider } from '@mechamittens/ui/app/contexts/i18n'
import ErrorPage from '@mechamittens/ui/app/pages/error'
import Routes from '@mechamittens/ui/app/pages/routes'
import { MetaMetricsProvider, LegacyMetaMetricsProvider } from '@mechamittens/ui/app/contexts/metametrics'

import '../styles/index.scss'

export const App = () => {
  return <HashRouter hashType="noslash">
    <MetaMetricsProvider>
      <LegacyMetaMetricsProvider>
        <I18nProvider>
          <LegacyI18nProvider>
            <Routes />
          </LegacyI18nProvider>
        </I18nProvider>
      </LegacyMetaMetricsProvider>
    </MetaMetricsProvider>
  </HashRouter>
}
