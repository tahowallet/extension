import { v4 as uuidv4 } from "uuid"

import { FeatureFlags, isEnabled } from "../features"

export const POSTHOG_URL =
  process.env.POSTHOG_URL ?? "https://app.posthog.com/capture/"

// Destructuring doesn't work with env variables. process.nev is `MISSING ENV VAR` in that case
// eslint-disable-next-line prefer-destructuring
export const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY

// Destructuring doesn't work with env variables. process.nev is `MISSING ENV VAR` in that case
// eslint-disable-next-line prefer-destructuring
export const USE_ANALYTICS_SOURCE = process.env.USE_ANALYTICS_SOURCE

export function shouldSendAnalyticsEvents(): boolean {
  return (
    isEnabled(FeatureFlags.SUPPORT_ANALYTICS) &&
    !!POSTHOG_URL &&
    !!POSTHOG_API_KEY
  )
}

export function createAnalyticsPayloadForFetch(
  personUUID: string,
  eventName: string,
  payload?: Record<string, unknown>
): RequestInit {
  return {
    method: "POST",
    body: JSON.stringify({
      // See posthog Data model: https://posthog.com/docs/how-posthog-works/data-model
      // ID of the event
      uuid: uuidv4(),
      // The unique or anonymous id of the user that triggered the event.
      distinct_id: personUUID,
      // api key
      api_key: POSTHOG_API_KEY,
      // name of the event
      event: eventName,
      // Let's include a timestamp just to be sure. Optional.
      timestamp: new Date().toISOString(),
      properties: {
        // $lib property name is a convention used by posthog to send in the source property.
        // We want to separate events based on which context/phase/source they originate from
        // The intended context/phase/source at the moment of writing: DEV, BETA, PROD
        // This can be overwritten in .env so devs can check their events during dev
        $lib: USE_ANALYTICS_SOURCE,
        // properties[$current_url] is a convention used by posthog
        // Let's store the URL so we can differentiate between the sources later on.
        $current_url: window.location.href,
        // Let's also send in anything that we might send with the event. Eg time
        ...payload,
      },
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }
}
