export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function parseTime(text: string): number | null {
  const parts = text.trim().split(':')
  if (!/^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(text.trim())) return null
  const values = parts.map(Number)
  if (values.some((n) => !Number.isFinite(n))) return null
  const [h, m, s] = values.length === 3 ? values : [0, values[0], values[1]]
  if (m >= 60 || s >= 60) return null
  return (h * 3600 + m * 60 + s) * 1000
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
