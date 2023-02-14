// Ignore the no-console lint rule since this file is meant to funnel output to
// the console.
/* eslint-disable no-console */

import browser from "webextension-polyfill"

// Clear all localStorage logs on load, which were used in older versions of
// the extension.
localStorage.removeItem("logs")

enum LogLevel {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
}

interface LogStyle {
  icon: string
  css: string[]
  dateCss?: string[]
}

interface LogStyles {
  debug: LogStyle & { dateCss: string[] }
  log: LogStyle
  info: LogStyle
  warn: LogStyle
  error: LogStyle
}

const styles: LogStyles = {
  debug: {
    icon: "🐛",
    css: [],
    dateCss: ["float: right"],
  },
  log: {
    icon: "🪵",
    css: [],
  },
  info: {
    icon: "💡",
    css: ["color: blue"],
  },
  warn: {
    icon: "⚠️",
    css: [
      "color: #63450b",
      "background-color: #fffbe5",
      "border: 1px solid #fff5c2",
      "padding: 0.5em",
    ],
  },
  error: {
    icon: "❌",
    css: [
      "color: #ff1a1a",
      "background-color: #fff0f0",
      "border: 1px solid #ffd6d6",
      "padding: 0.5em",
    ],
  },
}

function purgeSensitiveFailSafe(log: string): string {
  // 1. Hexadecimal segments
  // 2. Private key length segments
  // 3. Lowercase groups of 12 words, which therefore covers 24

  return log.replaceAll(
    /0x[0-9a-fA-F]+|(\b[a-zA-Z0-9]{64}\b)|(?:[a-z]+(?:\s|$)){12}/g,
    "[REDACTED]"
  )
}

const isBackgroundLogger = browser.extension.getBackgroundPage() === window
// isPopupLogger will briefly be true even if we're in a tab, but should
// quickly resolve to false.
//
// Note that as of this comment's writing the content scripts do not use the
// logger, so defaulting to true should generally always produce the correct
// result even if the following check never completes.
let isPopupLogger = !isBackgroundLogger
browser.tabs.getCurrent().then((value) => {
  isPopupLogger = !isBackgroundLogger && value === undefined
})

async function saveLog(
  level: LogLevel,
  isoDateString: string,
  logLabel: string,
  input: unknown[],
  stackTrace: string[] | undefined
) {
  const formattedInput = input
    .map((loggedValue) => {
      if (typeof loggedValue === "object") {
        try {
          return JSON.stringify(loggedValue)
        } catch (_) {
          // If we can't stringify thats OK, we'll still see [object Object] or
          // null in the logs.
          return String(loggedValue)
        }
      } else {
        return String(loggedValue)
      }
    })
    .join(" ")

  const formattedStackTrace =
    stackTrace === undefined ? "" : `\n${stackTrace.join("\n")}`

  // Indent formatted input under the parent.
  const logData = `    ${formattedInput}${formattedStackTrace}`
    .split("\n")
    .join("\n    ")

  const logKey = `logs-${level}`
  const existingLogs = localStorage.getItem(logKey) ?? ""

  const backgroundPrefix = isBackgroundLogger ? "BG" : ""
  const popupPrefix = isPopupLogger ? "POPUP" : ""
  const tabPrefix = isBackgroundLogger || isPopupLogger ? "" : "TAB"

  const fullPrefix = `[${isoDateString}] [${level.toUpperCase()}:${backgroundPrefix}${popupPrefix}${tabPrefix}]`

  // Note: we have to do everything from here to `storage.local.set`
  // synchronously, i.e. no promises, otherwise we risk losing logs between
  // background and content/UI scripts.
  const purgedData = purgeSensitiveFailSafe(logData)
  const updatedLogs =
    `${existingLogs}${fullPrefix} ${logLabel}\n${purgedData}\n\n`
      // Restrict each log level to hold 50k characters to avoid excess resource
      // usage.
      .substring(0, 50000)

  localStorage.setItem(logKey, updatedLogs)
}

const BLINK_PREFIX = "    at "
const WEBKIT_GECKO_DELIMITER = "@"
const WEBKIT_MARKER = "@"
const GECKO_MARKER = "/"

function logLabelFromStackEntry(
  stackEntry: string | undefined
): string | undefined {
  // Blink-ish.
  if (stackEntry?.startsWith(BLINK_PREFIX)) {
    // "    at [Class.][function] (... source file ...)
    return stackEntry.substring(BLINK_PREFIX.length).split(" ")[0]
  }

  // Fall back to Gecko-ish.
  if (
    stackEntry?.includes(GECKO_MARKER) &&
    stackEntry.includes(WEBKIT_GECKO_DELIMITER)
  ) {
    // "[path/to/Class/]method<?[/internal<?]@(... source file ...)"
    return stackEntry
      .split(WEBKIT_GECKO_DELIMITER)[0]
      .split(GECKO_MARKER)
      .filter((item) => item.replace(/(?:promise)?</, "").trim() !== "")
      .slice(-2)
      .join(".")
  }

  // WebKit-ish.
  if (stackEntry?.includes(WEBKIT_MARKER)) {
    // "[function]@(... source ...)
    return stackEntry.split(WEBKIT_MARKER)[0]
  }

  return undefined
}

function genericLogger(level: LogLevel, input: unknown[]) {
  const stackTrace = new Error().stack
    ?.split("\n")
    ?.filter((line) => {
      // Remove empty lines from the output
      // Chrome prepends the word "Error" to the first line of the trace, but Firefox doesn't
      // Let's ignore that for consistency between browsers!
      if (line.trim() === "" || line.trim() === "Error") {
        return false
      }

      return true
    })
    // The first two lines of the stack trace will always be generated by this
    // file, so let's ignore them.
    ?.slice(2)

  const logLabel =
    logLabelFromStackEntry(stackTrace?.[0]) ?? "(unknown function)"
  const isoDateString = new Date().toISOString()
  const [logDate, logTime] = isoDateString.split(/T/)

  console.group(
    `%c ${styles[level].icon} [${logTime.replace(
      /Z$/,
      ""
    )}] ${logLabel} %c [${logDate}]`,
    styles[level].css.join(";"),
    styles[level].dateCss ?? styles.debug.dateCss.join(";")
  )

  console[level](...input)

  // Suppress displaying stack traces when we use console.error(), since the browser already does that
  if (typeof stackTrace !== "undefined" && level !== "error") {
    console[level](stackTrace.join("\n"))
  }

  console.groupEnd()

  saveLog(level, isoDateString, logLabel, input, stackTrace)
}

const logger = {
  debug(...input: unknown[]): void {
    genericLogger(LogLevel.debug, input)
  },

  log(...input: unknown[]): void {
    genericLogger(LogLevel.log, input)
  },

  info(...input: unknown[]): void {
    genericLogger(LogLevel.info, input)
  },

  warn(...input: unknown[]): void {
    genericLogger(LogLevel.warn, input)
  },

  error(...input: unknown[]): void {
    genericLogger(LogLevel.error, input)
  },
}

// The length of an ISO8601 date string.
const iso8601Length = 24
// A regular expression that matches ISO8601 date strings as generated by
// `Date.toISOString()`.
const iso8601DateRegExpString =
  "\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+(?:[+-][0-2]\\d:[0-5]\\d|Z)"
// Matches start-of-line ISO dates in brackets with a space and bracket
// following, matching our serliazed logging pattern. A zero-width positive
// lookahead is used so that a split using this regex will not consume the date
// when splitting.
const logDateRegExp = new RegExp(
  `(?=^\\[${iso8601DateRegExpString}\\] \\[)`,
  "m"
)

type StoredLogData = {
  -readonly [level in keyof typeof LogLevel]: string
}

export function serializeLogs(): string {
  const logs: StoredLogData = {
    debug: localStorage.getItem("logs-debug") ?? "",
    log: localStorage.getItem("logs-log") ?? "",
    info: localStorage.getItem("logs-info") ?? "",
    warn: localStorage.getItem("logs-warn") ?? "",
    error: localStorage.getItem("logs-error") ?? "",
  }

  if (Object.values(logs).every((entry) => entry === "")) {
    return "[NO LOGS FOUND]"
  }

  const logEntries = Object.values(logs).flatMap((levelLogs) => {
    const splitLogs = levelLogs?.split(logDateRegExp) ?? []
    // If the date of the first element got cut off, use the 0 date for it.
    if (
      splitLogs.length > 0 &&
      splitLogs[0] !== "" &&
      !splitLogs[0].match(logDateRegExp)
    ) {
      splitLogs[0] = `[${new Date(0).toISOString()}] ${splitLogs[0]}`
    }

    return splitLogs
  })

  const HOUR = 1000 * 60 * 60
  return (
    logEntries
      // Only grab logs from the past hour
      .filter((logLine) => {
        // There was a problem here with the format of the current date.
        // The date for the log line was in ISO standard.
        // Both dates should be created using the same standard.
        const currentDate = new Date(Date.now() - HOUR).toISOString()
        return (
          new Date(logLine.substring(1, iso8601Length)) >
          new Date(currentDate.slice(0, -1))
        )
      })
      // Sort by date.
      .sort((a, b) => {
        return a
          .substr(1, iso8601Length)
          .localeCompare(b.substr(1, iso8601Length))
      })
      .join("\n")
  )
}

export default logger
