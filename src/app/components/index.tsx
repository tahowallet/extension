import { HashRouter } from 'react-router-dom'
import { Provider } from 'react-redux'

import { I18nProvider, LegacyI18nProvider } from '@mechamittens/extension/ui/app/contexts/i18n'
import ErrorPage from '@mechamittens/extension/ui/app/pages/error'
import Routes from '@mechamittens/extension/ui/app/pages/routes'
import { MetaMetricsProvider, LegacyMetaMetricsProvider } from '@mechamittens/extension/ui/app/contexts/metametrics'

import '../styles/index.scss'

export const Root = ({ store }) => {
  return <Provider store={store}>
    <HashRouter hashType="noslash">
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
  </Provider>
}
