import { startApp as _startApp } from '@mechamittens/extension/ui/setup'
import { startApp } from './'

const initialUIState = {
    "isInitialized": false,
    "connectedStatusPopoverHasBeenShown": true,
    "defaultHomeActiveTabName": null,
    "provider": {
        "type": "mainnet"
    },
    "network": "1",
    "settings": {
        "ticker": "ETH"
    },
    "accounts": {},
    "currentBlockGasLimit": "",
    "unapprovedTxs": {},
    "currentNetworkTxList": [],
    "cachedBalances": {},
    "contractExchangeRates": {},
    "unapprovedMsgs": {},
    "unapprovedMsgCount": 0,
    "unapprovedPersonalMsgs": {},
    "unapprovedPersonalMsgCount": 0,
    "unapprovedDecryptMsgs": {},
    "unapprovedDecryptMsgCount": 0,
    "unapprovedEncryptionPublicKeyMsgs": {},
    "unapprovedEncryptionPublicKeyMsgCount": 0,
    "unapprovedTypedMessages": {},
    "unapprovedTypedMessagesCount": 0,
    "isUnlocked": false,
    "keyringTypes": [
        "Simple Key Pair",
        "HD Key Tree",
        "Trezor Hardware",
        "Ledger Hardware"
    ],
    "keyrings": [],
    "frequentRpcListDetail": [],
    "accountTokens": {},
    "assetImages": {},
    "tokens": [],
    "suggestedTokens": {},
    "useBlockie": false,
    "useNonceField": false,
    "usePhishDetect": true,
    "featureFlags": {
        "showIncomingTransactions": true,
        "transactionTime": false
    },
    "knownMethodData": {},
    "participateInMetaMetrics": null,
    "firstTimeFlowType": null,
    "currentLocale": "en",
    "identities": {},
    "lostIdentities": {},
    "forgottenPassword": false,
    "preferences": {
        "showFiatInTestnets": false,
        "useNativeCurrencyAsPrimaryCurrency": true
    },
    "completedOnboarding": false,
    "metaMetricsId": null,
    "metaMetricsSendCount": 0,
    "ipfsGateway": "dweb.link",
    "addressBook": {},
    "conversionDate": 1615842099.493,
    "conversionRate": 1794.38,
    "currentCurrency": "usd",
    "nativeCurrency": "ETH",
    "alertEnabledness": {
        "unconnectedAccount": true
    },
    "unconnectedAccountAlertShownOrigins": {},
    "seedPhraseBackedUp": true,
    "onboardingTabs": {},
    "incomingTransactions": {},
    "incomingTxLastFetchedBlocksByNetwork": {
        "ropsten": null,
        "rinkeby": null,
        "kovan": null,
        "goerli": null,
        "mainnet": null
    },
    "permissionsRequests": [],
    "permissionsDescriptions": {},
    "permissionsLog": [],
    "permissionsHistory": {},
    "domainMetadata": {},
    "ensResolutionsByAddress": {}
}

const mechamittensApp = _startApp(
  {
    currentLocale: 'en',
    textDirection: 'ltr',
    ...initialUIState
  },
  {
    on: (...args: any[]) => null
  },
  {
    activeTab: {},
    container: document.createElement('div')
  },
)

mechamittensApp.then((store : any) => {
  startApp(store.getState(), document.getElementById('tally-root'))
})
