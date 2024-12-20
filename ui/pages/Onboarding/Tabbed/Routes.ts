export const ONBOARDING_ROOT = "/tab.html#onboarding"

const OnboardingRoutes = {
  ONBOARDING_START: "/onboarding",
  ADD_WALLET: "/onboarding/add-wallet",
  LEDGER: "/onboarding/ledger",
  GRIDPLUS: "/onboarding/gridplus",
  SET_PASSWORD: "/onboarding/set-password",
  IMPORT_SEED: "/onboarding/import-seed",
  IMPORT_PRIVATE_KEY: "/onboarding/import-private-key",
  NEW_SEED: "/onboarding/new-seed",
  VIEW_ONLY_WALLET: "/onboarding/view-only-wallet",
  ONBOARDING_COMPLETE: "/onboarding/done",
} as const

export default OnboardingRoutes
