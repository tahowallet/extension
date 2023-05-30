import type { PlaywrightTestConfig } from "@playwright/test"
import { devices } from "@playwright/test"

/**
 * Read environment variables
 */
import "dotenv-defaults/config"

const SECOND = 1e3
const CI_ENV = typeof process.env.CI === "string"

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  testDir: "./e2e-tests",
  /* Maximum time one test can run for. */
  timeout: 240 * SECOND,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: (CI_ENV ? 60 : 15) * SECOND,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: CI_ENV,
  /* Retry on CI only */
  retries: CI_ENV ? 2 : 0,
  /**
   * Opt out of parallel tests since we interact with real APIs during testing
   */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "retain-on-failure",

    /* The trace will include screenshots so we don't need them */
    // screenshot: 'only-on-failure',

    /* Setting video here does not work in our case. See https://github.com/microsoft/playwright/issues/11833 */
    // video: 'retain-on-failure',

    /*
    contextOptions: {
      recordVideo: {
        dir: './videos', // Or wherever you want the videos to be saved.
      }
    }
    */

    /* For debugging purposes */
    // launchOptions: {
    //   slowMo: 1000,
    // },

    /* Needed to verify the content of the clipboard */
    permissions: ["clipboard-read"],
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // See `utils.ts` for additional options passed to setup extension
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',
}

export default config
