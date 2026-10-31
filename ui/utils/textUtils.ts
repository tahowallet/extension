export function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1)
}

export function trimWithEllipsis(text: string, maxLength: number): string {
  return text && text.length > maxLength
    ? `${text.slice(0, maxLength).trim()}...`
    : text
}

/**
 * Shorten a name like an ENS name by cutting its middle, so both its start and
 * its suffix (e.g. ".eth") stay visible. Names that fit are left alone.
 */
export function trimNameMiddle(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name

  // Keep a short suffix whole; a "suffix" longer than this is likely just
  // part of the name.
  const dot = name.lastIndexOf(".")
  const suffix = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : ""
  const label = name.slice(0, name.length - suffix.length)

  // Room for the label, less the ellipsis; split between its start and end.
  const room = Math.max(maxLength - suffix.length - 1, 2)
  const tail = Math.min(3, Math.floor(room / 3))
  return `${label.slice(0, room - tail)}…${label.slice(label.length - tail)}${suffix}`
}
