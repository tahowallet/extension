// We use the classInstance["privateMethodOrVariableName"] to access private properties in a type safe way
// without redefining the types. This is a typescript shortcoming that we can't easily redefine class member visibility.
// https://github.com/microsoft/TypeScript/issues/22677
// POC https://www.typescriptlang.org/play?#code/MYGwhgzhAEBiD29oG8BQ0PWPAdhALgE4Cuw+8hAFAA6ECWAbmPgKbRgBc0B9OA5gBpotRszYAjLjmIBbcS0IBKFAF9Ua1CBb5oAM0TQAvNBwsA7nESUARGHHBrQgIwAmAMyLU2PPC0A6EHg+Sn14AG1bawBdZQB6WOgAeQBpVHisXAhfFgCgkMQIgH0waLiEgFEAJUrEyrSE0IiSqKNoAFZodKqayqA
/* eslint-disable @typescript-eslint/dot-notation */

import * as uuid from "uuid"

import AnalyticsService from ".."
import * as features from "../../../features"
import { createAnalyticsService } from "../../../tests/factories"
import { Writeable } from "../../../types"
import PreferenceService from "../../preferences"

describe("AnalyticsService", () => {
  let analyticsService: AnalyticsService
  let preferenceService: PreferenceService
  const runtimeFlagWritable = features.RuntimeFlag as Writeable<
    typeof features.RuntimeFlag
  >
  beforeAll(() => {
    global.fetch = jest.fn()
    // We need this set otherwise the posthog lib won't send the events
    process.env.POSTHOG_API_KEY = "hey hey hey"
  })
  beforeEach(async () => {
    jest.clearAllMocks()

    analyticsService = await createAnalyticsService()

    preferenceService = analyticsService["preferenceService"]

    jest.spyOn(preferenceService, "getAnalyticsPreferences")
    jest.spyOn(preferenceService, "updateAnalyticsPreferences")
    jest.spyOn(preferenceService.emitter, "emit")
    jest.spyOn(analyticsService["db"], "setAnalyticsUUID")
  })
  describe("the setup starts with the proper environment setup", () => {
    it("PreferenceService should be initialized with isEnabled off and hasDefaultOnBeenTurnedOn off by default", async () => {
      expect(await preferenceService.getAnalyticsPreferences()).toStrictEqual({
        isEnabled: false,
        hasDefaultOnBeenTurnedOn: false,
      })

      expect(preferenceService.getAnalyticsPreferences).toBeCalled()
    })
    it("should change the isEnabled output based on the changed feature flag", () => {
      runtimeFlagWritable.SUPPORT_ANALYTICS = false
      runtimeFlagWritable.ENABLE_ANALYTICS_DEFAULT_ON = false

      expect(features.isEnabled(features.FeatureFlags.SUPPORT_ANALYTICS)).toBe(
        false
      )
      expect(
        features.isEnabled(features.FeatureFlags.ENABLE_ANALYTICS_DEFAULT_ON)
      ).toBe(false)

      runtimeFlagWritable.SUPPORT_ANALYTICS = true
      runtimeFlagWritable.ENABLE_ANALYTICS_DEFAULT_ON = true

      expect(features.isEnabled(features.FeatureFlags.SUPPORT_ANALYTICS)).toBe(
        true
      )
      expect(
        features.isEnabled(features.FeatureFlags.ENABLE_ANALYTICS_DEFAULT_ON)
      ).toBe(true)
    })
  })
  describe("before the feature is released (the feature flags are off)", () => {
    beforeEach(async () => {
      runtimeFlagWritable.SUPPORT_ANALYTICS = false
      runtimeFlagWritable.ENABLE_ANALYTICS_DEFAULT_ON = false

      await analyticsService.startService()
    })
    it("should not send any analytics events when both of the feature flags are off", async () => {
      await analyticsService.sendAnalyticsEvent("Background start")

      expect(fetch).not.toBeCalled()
    })
    it("should not send any analytics events when only the support feature flag is on but the default on is not", async () => {
      await analyticsService.sendAnalyticsEvent("Background start")

      expect(fetch).not.toBeCalled()
    })
  })
  describe("when the feature is released (feature flags are on, but settings is still off)", () => {
    beforeEach(async () => {
      runtimeFlagWritable.SUPPORT_ANALYTICS = true
      runtimeFlagWritable.ENABLE_ANALYTICS_DEFAULT_ON = true

      await analyticsService.startService()
    })

    it("should change isEnabled and hasDefaultOnBeenTurnedOn to true in PreferenceService", async () => {
      // The default off value for analytics settings in PreferenceService has a test in the environment setup describe
      expect(await preferenceService.getAnalyticsPreferences()).toStrictEqual({
        isEnabled: true,
        hasDefaultOnBeenTurnedOn: true,
      })
      expect(preferenceService.updateAnalyticsPreferences).toBeCalledTimes(1)
    })
    it("should emit settings update event to notify UI", async () => {
      expect(preferenceService.emitter.emit).toBeCalledTimes(1)
      expect(preferenceService.emitter.emit).toBeCalledWith(
        "updateAnalyticsPreferences",
        {
          isEnabled: true,
          hasDefaultOnBeenTurnedOn: true,
        }
      )
      expect(preferenceService.updateAnalyticsPreferences).toBeCalledTimes(1)
    })

    it("should generate a new uuid", async () => {
      // Called once for generating the new user uuid
      // and another time when sending the pothog event
      expect(uuid.v4).toBeCalledTimes(2)

      // Posthog events are sent through global.fetch method
      expect(fetch).toBeCalledTimes(1)
    })

    it.todo("should send 'New Install' and 'Background start' events")
  })
  describe("feature is released and enabled", () => {
    it.todo("should send 'Background start' event when the service starts")
    it.todo("should set the uninstall url when the service starts")
  })
  describe("feature is released but disabled", () => {
    it.todo("should not send any event when the service starts")
    it.todo("should not send any event when the service starts")
  })
})
