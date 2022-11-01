import "@testing-library/jest-dom"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
