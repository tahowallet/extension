import { ReactElement } from "react"
import { useThemeSync } from "../../hooks/theme-hooks"

/** Keeps the page's theme in step with the user's preference. */
export default function ThemeSync(): ReactElement | null {
  useThemeSync()
  return null
}
