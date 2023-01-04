// Ignore the no-console lint rule since this file is meant to funnel output to
// the console.
/* eslint-disable no-console */

import _ from "lodash"
import browser from "webextension-polyfill"

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

export enum LoggerEnvironment {
  bg = "bg",
  popup = "popup",
}

type LogEntry = {
  level: LogLevel
  timestamp: number
  isoDateString: string
  logLabel: string
  input: unknown[]
  stackTrace: string[] | undefined
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

function getEnvGroupKey(
  environment: LoggerEnvironment | "unknown",
  level: LogLevel
) {
  return `logs-${level}-${environment}`
}

const logger = () => {
  let environment: LoggerEnvironment | "unknown" = "unknown"
  let isBackgroundLogger = false
  let isPopupLogger = false
  const queue: LogEntry[] = []
  let isInitialized = false
  let isProcessing = false

  function groupKey(level: LogLevel) {
    return getEnvGroupKey(environment, level)
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

  // Does some formatting, and saves the entry.
  async function saveLog(entry: LogEntry) {
    const { level, logLabel, isoDateString, input, stackTrace } = entry

    const formattedInput = input
      .map((loggedValue) => {
        if (typeof loggedValue === "object") {
          try {
            return JSON.stringify(loggedValue)
          } catch (err) {
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

    const existingLogs = _.get(
      await browser.storage.local.get(groupKey(level)),
      groupKey(level),
      ""
    )

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

    await browser.storage.local.set({ [groupKey(level)]: updatedLogs })
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

  // Registers contextual data: time and stack
  function prepareLogEntry(level: LogLevel, input: unknown[]): LogEntry {
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

    const timestamp = Date.now()
    const logLabel =
      logLabelFromStackEntry(stackTrace?.[1]) ?? "(unknown function)"
    const isoDateString = new Date(timestamp).toISOString()

    return {
      level,
      logLabel,
      timestamp,
      isoDateString,
      input,
      stackTrace,
    }
  }

  function writeToConsole(entry: LogEntry) {
    const { level, logLabel, isoDateString, input, stackTrace } = entry
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
  }

  const processQueue = async () => {
    if (!isInitialized || isProcessing) {
      return
    }
    isProcessing = true

    const nextItem = queue.shift()
    if (!nextItem) {
      isProcessing = false
      return
    }

    await saveLog(nextItem)

    isProcessing = false
    processQueue()
  }

  function enqueue(level: LogLevel, input: unknown[]) {
    const entry = prepareLogEntry(level, input)
    queue.push(entry)
    writeToConsole(entry)
    processQueue()
  }

  async function clearStorage() {
    await browser.storage.local.remove([
      groupKey(LogLevel.debug),
      groupKey(LogLevel.log),
      groupKey(LogLevel.info),
      groupKey(LogLevel.warn),
      groupKey(LogLevel.error),
    ])
  }

  async function init(env: LoggerEnvironment) {
    environment = env
    isBackgroundLogger = environment === LoggerEnvironment.bg
    isPopupLogger = environment === LoggerEnvironment.popup

    // Clear all locally stored logs on load, which were used in older versions
    // of the extension.
    await clearStorage()
    isInitialized = true

    // Process items what eventually arrived to the queue before initialization
    // completed.
    processQueue()
  }

  return {
    init,
    debug(...input: unknown[]): void {
      enqueue(LogLevel.debug, input)
    },
    log(...input: unknown[]): void {
      enqueue(LogLevel.log, input)
    },
    info(...input: unknown[]): void {
      enqueue(LogLevel.info, input)
    },
    warn(...input: unknown[]): void {
      enqueue(LogLevel.warn, input)
    },
    error(...input: unknown[]): void {
      enqueue(LogLevel.error, input)
    },
  }
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

async function concatLogGroups(level: LogLevel) {
  const keys = [
    getEnvGroupKey(LoggerEnvironment.bg, level),
    getEnvGroupKey(LoggerEnvironment.popup, level),
  ]
  const logsByEnv = await browser.storage.local.get(keys)
  return Object.values(logsByEnv).join()
}

export async function serializeLogs(): Promise<string> {
  const logs: StoredLogData = {
    debug: await concatLogGroups(LogLevel.debug),
    log: await concatLogGroups(LogLevel.log),
    info: await concatLogGroups(LogLevel.info),
    warn: await concatLogGroups(LogLevel.warn),
    error: await concatLogGroups(LogLevel.error),
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

  return (
    logEntries
      // Sort by date.
      .sort((a, b) => {
        return a
          .substr(1, iso8601Length)
          .localeCompare(b.substr(1, iso8601Length))
      })
      .join("\n")
  )
}

export default logger()
