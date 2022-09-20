import {v4 as uuidv4} from 'uuid';

let myuuid = uuidv4();

/* just some quick thoughts on pushing to posthog on a
 per event basis instead of including a lib...
 nothing to store and allows us to keep things pretty simple.
 */

interface HogEventProp {
  distinct_id: string
  data: string
}

export interface HogEvent {
  api_key: string
  event: string
  properties: {
    [key: string]: HogEventProp
  }
}

type HogResponse = {
  data: string
}

export async function createEvent(): Promise<HogResponse> {
  try {

    var browser = require("webextension-polyfill");

    const [currentTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    const response = await fetch("https://app.posthog.com/capture/", {
      method: "POST",
      body: JSON.stringify({
        // this is a safe public write only api key
        // roll this key for demo
        api_key: "phc_VzveyNxrn2xyiKDYn7XjrgaqELGeUilDZGiBVh6jNmh",
        event: "Wallet Opened - Erik",
        properties: {
          distinct_id: myuuid,
          data:  "This is a test to storing event data into posthog",
          current_url: currentTab.url,
          $lib: currentTab.url,
        },
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Error! status: ${response.status}`)
    }
    const result = (await response.json()) as HogResponse
    // eslint-disable-next-line no-console
    console.log("data: ", JSON.stringify(result, null, 4))
    console.log("current tab url:", currentTab.url)

    return result
  } catch (error) {
    if (error instanceof Error) {
      return Promise.reject(error.message)
    } // eslint-disable-next-line no-console
    return Promise.reject(console.log("unexpected error: "))
  }
}

// export function CreatePostHogSender<T>(HogEventproperties) {
//   return (props: T) => {
//     createEvent()
//   }
// }

// export const WalletOpenedEvent =
//   CreatePostHogSender<WalletOpenedEventProps>("Wallet Opened")
