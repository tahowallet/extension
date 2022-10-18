// eslint-disable-next-line
export const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY

export function posthogEvent(eventName: string) {
  if (process.env.SUPPORT_ANALYTICS === "true") {
    chrome.cookies.get(
      {
        url: "https://deploy-preview-113--tally-cash.netlify.app/download/",
        name: "UUID",
      },

      async function fetchCookie(cookie) {
        if (cookie) {
          fetch("https://app.posthog.com/capture/", {
            method: "POST",
            body: JSON.stringify({
              api_key: POSTHOG_API_KEY,
              event: eventName,
              properties: {
                distinct_id: cookie.value,
                data: "This adds posthog events to Tally extension",
                current_url: window.location.href,
                $lib: window.location.href,
              },
            }),
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          })
          // eslint-disable-next-line no-console
          console.log("UUID: ", cookie.value)
        } else {
          // eslint-disable-next-line no-console
          console.log("No UUID Present")
        }
      }
    )
  }
}
