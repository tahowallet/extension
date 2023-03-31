import { v4 as uuidv4 } from "uuid"

import { FeatureFlags, isEnabled } from "../features"
import logger from "./logger"

export enum AnalyticsEvent {
  NEW_INSTALL = "New install",
  UI_SHOWN = "UI shown",
  NEW_ACCOUNT_TO_TRACK = "Address added to tracking on network",
  CUSTOM_CHAIN_ADDED = "Custom chain added",
}

export enum OneTimeAnalyticsEvent {
  ONBOARDING_STARTED = "Onboarding Started",
  ONBOARDING_FINISHED = "Onboarding Finished",
}

export const isOneTimeAnalyticsEvent = (
  eventName: string
): eventName is OneTimeAnalyticsEvent => {
  return Object.values<string>(OneTimeAnalyticsEvent).includes(eventName)
}

const POSTHOG_PROJECT_ID = "11112"

const PERSON_ENDPOINT = `https://app.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/persons`

export const POSTHOG_URL =
  process.env.POSTHOG_URL ?? "https://app.posthog.com/capture/"

// Destructuring doesn't work with env variables. process.nev is `MISSING ENV VAR` in that case
// eslint-disable-next-line prefer-destructuring
export const USE_ANALYTICS_SOURCE = process.env.USE_ANALYTICS_SOURCE

export function shouldSendPosthogEvents(): boolean {
  return (
    isEnabled(FeatureFlags.SUPPORT_ANALYTICS) && !!process.env.POSTHOG_API_KEY
  )
}

export function createPosthogPayload(
  personUUID: string,
  eventName: string,
  payload?: Record<string, unknown>
): string {
  return JSON.stringify({
    // See posthog Data model: https://posthog.com/docs/how-posthog-works/data-model
    // ID of the event
    uuid: uuidv4(),
    // The unique or anonymous id of the user that triggered the event.
    distinct_id: personUUID,
    // api key
    api_key: process.env.POSTHOG_API_KEY,
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
  })
}

export function sendPosthogEvent(
  personUUID: string,
  eventName: string,
  payload?: Record<string, unknown>
): void {
  try {
    if (shouldSendPosthogEvents()) {
      // fetchJson works only with GET requests
      fetch(POSTHOG_URL, {
        method: "POST",
        body: createPosthogPayload(personUUID, eventName, payload),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
    }
  } catch (e) {
    logger.debug("Sending analytics event failed with error: ", e)
  }
}

export async function getPersonId(personUUID: string): Promise<string> {
  const res = await fetch(`${PERSON_ENDPOINT}?distinct_id=${personUUID}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    },
  })

  const response = await res.json()
  return response.results[0].id
}

export function deletePerson(personID: string): void {
  fetch(`${PERSON_ENDPOINT}/${personID}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    },
  })
}
