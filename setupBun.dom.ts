import { JSDOM } from "jsdom"

const dom = new JSDOM(
  "<!DOCTYPE html><html><head></head><body></body></html>",
  {
    url: "http://localhost",
    pretendToBeVisual: true,
  },
)

const window = dom.window

// Register all browser globals from jsdom.
const BROWSER_GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "screen",
  "localStorage",
  "sessionStorage",
  "MutationObserver",
  "IntersectionObserver",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLFormElement",
  "HTMLAnchorElement",
  "HTMLImageElement",
  "HTMLDivElement",
  "HTMLSpanElement",
  "HTMLSelectElement",
  "HTMLOptionElement",
  "HTMLTextAreaElement",
  "Node",
  "Element",
  "Document",
  "DocumentFragment",
  "Event",
  "CustomEvent",
  "KeyboardEvent",
  "MouseEvent",
  "FocusEvent",
  "InputEvent",
  "URL",
  "URLSearchParams",
  "Headers",
  "Request",
  "Response",
  "DOMParser",
  "XMLSerializer",
  "Range",
  "Selection",
  "Text",
  "Comment",
  "CSSStyleDeclaration",
  "getComputedStyle",
  "Image",
  "HTMLCollection",
  "NodeList",
  "DOMTokenList",
  "ResizeObserver",
  "Blob",
  "File",
  "FileList",
  "FormData",
  "AbortController",
  "AbortSignal",
] as const

for (const key of BROWSER_GLOBALS) {
  if (key in window && !(key in globalThis)) {
    Object.defineProperty(globalThis, key, {
      value: (window as Record<string, unknown>)[key],
      writable: true,
      configurable: true,
    })
  }
}

// Ensure globalThis.window points to our jsdom window.
if (!("window" in globalThis)) {
  Object.defineProperty(globalThis, "window", {
    value: window,
    writable: true,
    configurable: true,
  })
}
