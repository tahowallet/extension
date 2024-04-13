# Provider Bridge

## Security model

### General ideas/considerations

- the primary danger point is window.postMessage/window.addListener("message", ...).
  - the functions themselves as they are easily and often modified by logging utilities or malicious code
  - the message they send
- ports are not vulnerable, insofar as browser.runtime.connect is guaranteed to give us a port with our extension.
- Nothing from inpage can be trusted.
- Nothing from content-script that comes from inpage can be trusted.
- content-script itself is relatively isolated (this is why inpage exists), but we should still never treat any messages coming from it into background as anything but JSON data.
  - We should validate the incoming JSON from content scripts, ideally against a JSON schema. I'm somewhat concerned about performance here, but there are JSON schema definitions for all Ethereum JSON-RPC messages at https://github.com/ethereum/execution-apis/tree/main/src/schemas . Our incoming messages should almost all validate against these schemas (with some exceptions such as EIP-1102 account exposure requests).
  - that validation is the responsibility of the ContentScriptProviderPortService.
- We should def think about extension ordering issues, but for the most part our in-page aspects shouldn't really interact with the DOM beyond the initial injection of our code, I believe.
- The greater concern is some script or extension on the page simply doing a postMessage to request the signing of a transaction the user didn't actually want to sign.
  - It is still a vector for interfering with the dApp transactions

### Implemented strategies

- load inpage as soon as possible
  - manifest.json content_scripts[{ run_at: "document_start"}]
  - content: inpage injection
    - attach the script tag to the very top of the html
    - load the source code of inpage in the content script and inject
    - set script aync to false so the load of this script is blocking
    - remove the script from the dom after it has been loaded
- inpage: store a reference to the used functions inside the inpage store (so if they are modified later we are still using the pristine version)
- postMessage: always use targetOrigin
- addEventListener: always check incoming msgs
  - `event.origin !== window.location.origin` was it specified in targetOrigin that this is for us?
  - `event.source !== window ` did it originate from our window (inpage<>content)

## Reading material

- [The pitfalls of postMessage by Mathias Karlsson](https://labs.detectify.com/2016/12/08/the-pitfalls-of-postmessage/)
- [PostMessage Security in Chrome Extensions by Arseny Reutov slides](https://owasp.org/www-chapter-london/assets/slides/OWASPLondon_PostMessage_Security_in_Chrome_Extensions.pdf)
- [Attacking Modern Web Technologies - Frans Rosen](https://youtu.be/oJCCOnF25JU?t=1094)
  - [slides](https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=55)
  - [postMessage-tracker extension source](https://github.com/fransr/postMessage-tracker)
- [postMessage debugger extension by Wille Eklund](https://chrome.google.com/webstore/detail/postmessage-debugger/ibnkhbkkelpcgofjlfnlanbigclpldad)
  - [postMessage debugger extension source](https://github.com/bdo/chrome-postMessage-debugger) // just check the postMessage-debugger.js :)
- [After you, please: browser extensions order attacks and countermeasures whitepaper](https://link.springer.com/content/pdf/10.1007/s10207-019-00481-8.pdf) // this is mostly out of our reach but this is also not a really wide attack vector

## Ideas

- inpage script being a single IIFE that sets up a provider frozen with a deep Object.freeze so that tampering avenues are minimized—I'm not sure if that'll actually be feasible, though.
- [freeze the globalThis] (https://github.com/MetaMask/metamask-extension/blob/develop/app/scripts/lockdown-more.js)
- [create an iframe in inpage and grab the used fn instances (postMessage(). addEventListener() from there](https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95)
  - with this solution we don't have to worry about any modifications
  - this could be taken further and instantiate a communication provider there and in the inpage too and compare them as a measure to detect any modification
- phising detection or blacklist would also be a good idea
- consider the size of content and inpage scripts as they get injected into every webpage
  - eg webextension-polyfill is 37KB which is comparable to the size spa web framewoks.
    > It's absolutely fine for now bc this way we get to use the same apis everywhere but good thing to have this consideration in the back of our minds
- implement injection restrictions (only valid html files, blacklists?)
- add message validation mechanism to postMessage/addEventListener used in inpage<>content comm (signing, enveloping, asymmetric encryption etc. Can be as simple as a "parity bit")

## window.ethereum debug

This script can be put in [tamper monkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=hu) and it will log all the fn calls that is made to the window.ethereum essentially providing a "callstack" for the dapp communication. Works w/ most of the dapps.

```
(function() {
    'use strict';
    const rubberNeck = {
      apply: function (tgt, thisArg, argList) {
        console.log('apply', tgt.name, JSON.stringify(argList, null, 2));
        debugger;
        return Reflect.apply(tgt, thisArg, argList);
      },
    };
    const ethOrigi = window.ethereum;

    Object.getOwnPropertyNames(ethOrigi)
      .filter(i => typeof ethOrigi[i] === 'function' )
      .forEach(f => window.ethereum[f] = new Proxy(ethOrigi[f], rubberNeck))
    // Your code here...
})();
```

## window.postMessage debug

```
// ==UserScript==
// @name         postMessage debugger
// @description  Logs all the postMessage calls to the console
// @match        *://*/*
// ==/UserScript==

(function() {
  'use strict';

  const source = document.title || window.location.href;
  console.debug(`postMessageDebugger activated on '${source}'`);
  addEventListener('message', function(event) {
    console.log(
      `postMessage received by '${source}' from '${event.origin}' with data:`,
      JSON.stringify(event.data,null,2)
    );
  });
})();
```
