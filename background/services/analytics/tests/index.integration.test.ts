import sinon from "sinon"
import * as uuid from "uuid"

import AnalyticsService from ".."
import * as features from "../../../features"
import { createAnalyticsService } from "../../../tests/factories"
import { Writeable } from "../../../types"
import PreferenceService from "../../preferences"
import { PreferenceDatabase } from "../../preferences/db"
import { AnalyticsDatabase } from "../db"

type AnalyticsServiceExternalized = Omit<AnalyticsService, ""> & {
  internalStartService: () => Promise<void>
  preferenceService: PreferenceService
  db: AnalyticsDatabase
}

type PreferenceServiceExternalized = Omit<PreferenceService, ""> & {
  db: PreferenceDatabase
}

const sandbox = sinon.createSandbox()

describe("AnalyticsService", () => {
  let analyticsService: AnalyticsServiceExternalized
  let preferenceService: PreferenceServiceExternalized
  const runtimeFlagWritable = features.RuntimeFlag as Writeable<
    typeof features.RuntimeFlag
  >
  beforeEach(async () => {
    sandbox.restore()
    jest.clearAllMocks()

    analyticsService =
      (await createAnalyticsService()) as unknown as AnalyticsServiceExternalized

    preferenceService =
      analyticsService.preferenceService as unknown as PreferenceServiceExternalized

    jest.spyOn(analyticsService.preferenceService, "getAnalyticsPreferences")
    jest.spyOn(analyticsService.preferenceService, "updateAnalyticsPreferences")
    jest.spyOn(analyticsService.preferenceService.emitter, "emit")
    jest.spyOn(analyticsService.db, "setAnalyticsUUID")

    global.fetch = jest.fn()
  })
  describe("the setup starts with the proper environment setup", () => {
    it("PreferenceService should be initialized with isEnabled off and hasDefaultOnBeenTurnedOn off by default", async () => {
      const { isEnabled, hasDefaultOnBeenTurnedOn } =
        await preferenceService.getAnalyticsPreferences()

      expect(isEnabled).toBe(false)
      expect(hasDefaultOnBeenTurnedOn).toBe(false)
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
    it("should not send any analytics events when both of the feature flags are off", async () => {
      await analyticsService.startService()
      await analyticsService.sendAnalyticsEvent("Background start")

      expect(fetch).not.toBeCalled()
    })
    it("should not send any analytics events when only the support feature flag is on but the default on is not", async () => {
      await analyticsService.startService()
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
      expect(uuid.v4).toBeCalledTimes(1)
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
