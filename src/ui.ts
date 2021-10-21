import ui from "@tallyho/tally-ui"

const rootElement = document.getElementById("tally-root")
if (rootElement) {
  ui.attachToElement(rootElement)
} else {
  throw new Error("Failed to find #tally-root element; page structure changed?")
}
