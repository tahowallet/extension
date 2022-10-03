import {v4 as uuidv4} from 'uuid';

function getCookie(name: string)
 {
   var re = new RegExp(name + "=([^;]+)");
   var value = re.exec(document.cookie);
   return (value != null) ? unescape(value[1]) : null;
 }

var retrievedUUID = getCookie("UUID");

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

export function posthogEvent(eventName:string) {

  chrome.cookies.get({ url: 'http://localhost:8000', name: 'UUID' },
   function (cookie) {
     if (cookie) {
       console.log("UUID: ",cookie.value);
       createEvent(eventName, cookie.value)
     }
     else {
       console.log('No UUID found stored in localstorage');
     }
 });
}

export async function createEvent(eventName:string, userID:string): Promise<HogResponse> {
  try {

    var posthogEvent = eventName;

    const response = await fetch("https://app.posthog.com/capture/", {
      method: "POST",
      body: JSON.stringify({
        // this is a safe public write only api key
        // roll this key for demo
        api_key: "phc_VzveyNxrn2xyiKDYn7XjrgaqELGeUilDZGiBVh6jNmh",
        event: posthogEvent,
        properties: {
          distinct_id: userID,
          data:  "This is a test to storing event data into posthog",
          current_url: window.location.href,
          $lib: window.location.href,
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
