// We use the classInstance["privateMethodOrVariableName"] to access private properties in a type safe way
// without redefining the types. This is a typescript shortcoming that we can't easily redefine class member visibility.
// https://github.com/microsoft/TypeScript/issues/22677
// POC https://www.typescriptlang.org/play?#code/MYGwhgzhAEBiD29oG8BQ0PWPAdhALgE4Cuw+8hAFAA6ECWAbmPgKbRgBc0B9OA5gBpotRszYAjLjmIBbcS0IBKFAF9Ua1CBb5oAM0TQAvNBwsA7nESUARGHHBrQgIwAmAMyLU2PPC0A6EHg+Sn14AG1bawBdZQB6WOgAeQBpVHisXAhfFgCgkMQIgH0waLiEgFEAJUrEyrSE0IiSqKNoAFZodKqayqA
/* oxlint-disable typescript/dot-notation */

import { mock } from "bun:test"
import browser from "webextension-polyfill"

const v4Mock = mock(() => {})
mock.module("uuid", () => {
  const actual = require("uuid")
  v4Mock.mockImplementation(actual.v4)
  return { ...actual, v4: v4Mock }
})

import AnalyticsService from ".."
import { createAnalyticsService } from "../../../tests/factories"
import PreferenceService from "../../preferences"
import * as posthog from "../../../lib/posthog"

const { AnalyticsEvent } = posthog

describe("AnalyticsService", () => {
  let analyticsService: AnalyticsService
  let preferenceService: PreferenceService

  beforeAll(() => {
    global.fetch = jest.fn()
    // We need this set otherwise the posthog lib won't send the events
    process.env.POSTHOG_API_KEY = "hey hey hey"
  })
  beforeEach(async () => {
    jest.clearAllMocks()

    analyticsService = await createAnalyticsService()
    preferenceService = analyticsService["preferenceService"]
  })
  describe("the setup starts with the proper environment setup", () => {
    it("PreferenceService should be initialized with isEnabled off and hasDefaultOnBeenTurnedOn off by default", async () => {
      jest.spyOn(preferenceService, "getAnalyticsPreferences")

      expect(await preferenceService.getAnalyticsPreferences()).toEqual({
        isEnabled: false,
        hasDefaultOnBeenTurnedOn: false,
      })

      expect(preferenceService.getAnalyticsPreferences).toBeCalled()
    })
  })
  describe("when the feature is released (feature flags are on, but settings is still off)", () => {
    beforeEach(async () => {
      jest.spyOn(analyticsService["db"], "setAnalyticsUUID")
      jest.spyOn(analyticsService.emitter, "emit")
      jest.spyOn(preferenceService, "updateAnalyticsPreferences")
      jest.spyOn(preferenceService.emitter, "emit")
      jest.spyOn(posthog, "sendPosthogEvent")

      await analyticsService.startService()
    })

    it("should change isEnabled and hasDefaultOnBeenTurnedOn to true in PreferenceService", async () => {
      // The default off value for analytics settings in PreferenceService has a test in the environment setup describe
      expect(await preferenceService.getAnalyticsPreferences()).toEqual({
        isEnabled: true,
        hasDefaultOnBeenTurnedOn: true,
      })
      expect(preferenceService.updateAnalyticsPreferences).toBeCalledTimes(1)
    })
    it("should emit enableDefaultOn and settings update event to notify UI", async () => {
      expect(analyticsService.emitter.emit).toBeCalledTimes(2)
      expect(analyticsService.emitter.emit).toHaveBeenCalledWith(
        "enableDefaultOn",
        undefined,
      )
      expect(analyticsService.emitter.emit).toHaveBeenCalledWith(
        "serviceStarted",
        undefined,
      )

      expect(preferenceService.emitter.emit).toBeCalledTimes(1)
      expect(preferenceService.emitter.emit).toBeCalledWith(
        "updateAnalyticsPreferences",
        {
          isEnabled: true,
          hasDefaultOnBeenTurnedOn: true,
        },
      )
      expect(preferenceService.updateAnalyticsPreferences).toBeCalledTimes(1)
    })

    it("should generate a new uuid and save it to database", async () => {
      // Called once for generating the new user uuid
      // and once for the `New install' event
      expect(v4Mock).toBeCalledTimes(2)

      expect(analyticsService["db"].setAnalyticsUUID).toBeCalledTimes(1)
    })

    it("should send 'New Install' event", () => {
      // Posthog events are sent through global.fetch method
      // During initialization we send 2 events
      expect(fetch).toBeCalledTimes(1)

      expect(posthog.sendPosthogEvent).toHaveBeenCalledWith(
        expect.anything(),
        "New install",
        undefined,
      )
    })
  })
  describe("feature is released and enabled (analytics uuid has been created earlier)", () => {
    beforeEach(async () => {
      jest.spyOn(analyticsService, "sendAnalyticsEvent")
      jest.spyOn(preferenceService, "updateAnalyticsPreferences")
      jest
        .spyOn(preferenceService, "getAnalyticsPreferences")
        .mockImplementation(() =>
          Promise.resolve({
            isEnabled: true,
            hasDefaultOnBeenTurnedOn: true,
          }),
        )

      // Initialize analytics uuid
      await analyticsService["getOrCreateAnalyticsUUID"]()

      await analyticsService.startService()
    })
    it("should not run the initialization flow", async () => {
      // uuid should be already present
      expect(await analyticsService["getOrCreateAnalyticsUUID"]()).toEqual(
        expect.objectContaining({ isNew: false }),
      )

      expect(analyticsService.sendAnalyticsEvent).not.toHaveBeenCalledWith(
        expect.anything(),
        AnalyticsEvent.NEW_INSTALL,
        undefined,
      )

      expect(
        preferenceService.updateAnalyticsPreferences,
      ).not.toHaveBeenCalled()
    })

    it("should set the uninstall url when the service starts", async () => {
      expect(browser.runtime.setUninstallURL).toBeCalledTimes(1)
    })
  })
  describe("feature is released but disabled", () => {
    beforeEach(async () => {
      jest.spyOn(analyticsService, "sendAnalyticsEvent")
      jest.spyOn(posthog, "sendPosthogEvent")
      jest
        .spyOn(preferenceService, "getAnalyticsPreferences")
        .mockImplementation(() =>
          Promise.resolve({
            isEnabled: false,
            hasDefaultOnBeenTurnedOn: true,
          }),
        )

      // Initialize analytics uuid
      await analyticsService["getOrCreateAnalyticsUUID"]()

      await analyticsService.startService()
    })
    it("should not send any event when the service starts", async () => {
      expect(analyticsService.sendAnalyticsEvent).not.toBeCalled()

      expect(posthog.sendPosthogEvent).not.toBeCalled()
      expect(fetch).not.toBeCalled()
    })
    it("should not send any event when the 'sendAnalyticsEvent()' method is called", async () => {
      await analyticsService.sendAnalyticsEvent(AnalyticsEvent.UI_SHOWN)
      expect(analyticsService.sendAnalyticsEvent).toBeCalledTimes(1)

      expect(posthog.sendPosthogEvent).not.toBeCalled()
      expect(fetch).not.toBeCalled()
    })
  })
})
