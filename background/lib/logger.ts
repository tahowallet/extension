enum LogLevel {
  Log = "log",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

function genericLogger(level: LogLevel, input: any[]) {
  console[level].apply(this, input)
}

const logger = {
  log(...input: any[]) {
    genericLogger(LogLevel.Log, input)
  },

  info(...input: any[]) {
    genericLogger(LogLevel.Info, input)
  },

  warn(...input: any[]) {
    genericLogger(LogLevel.Warn, input)
  },

  error(...input: any[]) {
    genericLogger(LogLevel.Error, input)
  },
}

export default logger
