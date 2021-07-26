// Todo: needs pollyfill for alarms

const platform = globalThis.chrome || globalThis.browser || globalThis
const { alarms }  = platform

alarms.create()

export const alarms = alarms
