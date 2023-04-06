export function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1)
}

export function trimWithEllipsis(text: string, maxLength: number): string {
  return text && text.length > maxLength
    ? `${text.slice(0, maxLength).trim()}...`
    : text
}
