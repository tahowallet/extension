// Runs before the stylesheets so pages open in the stored theme rather than
// flashing dark while the background store connects.
import {
  applyTheme,
  readStoredThemePreference,
  resolveTheme,
  systemPrefersDark,
} from "@tallyho/tally-ui/utils/theme"

applyTheme(resolveTheme(readStoredThemePreference(), systemPrefersDark()))
