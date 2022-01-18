// remove default export once there is something else to export
export default function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1)
}
