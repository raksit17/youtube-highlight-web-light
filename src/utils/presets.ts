import type { ClipPreset, ClipPresets } from '@/types/domain'

export const PRESET_ORDER: ClipPreset[] = ['QUICK', 'CONTEXT', 'STANDARD', 'LONG']
export const CLIP_PRESET_CONFIG: Record<ClipPreset, { title: string; label: string; minDurationMs: number; defaultDurationMs: number; maxDurationMs: number; preRollMs: number; postRollMs: number }> = {
  QUICK:    { title: 'Quick',    label: '20–45s', minDurationMs: 20_000, defaultDurationMs: 30_000, maxDurationMs: 45_000, preRollMs: 10_000, postRollMs: 20_000 },
  CONTEXT:  { title: 'Context',  label: '45–90s', minDurationMs: 45_000, defaultDurationMs: 60_000, maxDurationMs: 90_000, preRollMs: 20_000, postRollMs: 40_000 },
  STANDARD: { title: 'Standard', label: '2–5m',   minDurationMs: 120_000, defaultDurationMs: 180_000, maxDurationMs: 300_000, preRollMs: 60_000, postRollMs: 120_000 },
  LONG:     { title: 'Long',     label: '5–8m',   minDurationMs: 300_000, defaultDurationMs: 360_000, maxDurationMs: 480_000, preRollMs: 120_000, postRollMs: 240_000 },
}

// Only used by Demo mode: in live mode the backend returns clipPresets.
export function buildPresetRange(preset: ClipPreset, peakMs: number, videoDurationMs: number) {
  const config = CLIP_PRESET_CONFIG[preset]
  if (videoDurationMs <= 0) return { label: config.label, startMs: 0, endMs: 0, durationMs: 0 }
  const peak = Math.min(videoDurationMs, Math.max(0, peakMs))
  const target = Math.min(config.defaultDurationMs, videoDurationMs)
  let start = peak - config.preRollMs
  let end = peak + config.postRollMs
  if (start < 0) { end -= start; start = 0 }
  if (end > videoDurationMs) { start = Math.max(0, start - (end - videoDurationMs)); end = videoDurationMs }
  if (end - start < target) {
    const missing = target - (end - start)
    const extendBefore = Math.min(start, missing)
    start -= extendBefore
    end = Math.min(videoDurationMs, end + missing - extendBefore)
  }
  if (end - start > target) end = start + target
  return { label: config.label, startMs: start, endMs: end, durationMs: end - start }
}
export function buildAllPresets(peakMs: number, videoDurationMs: number): ClipPresets {
  return {
    QUICK: buildPresetRange('QUICK', peakMs, videoDurationMs),
    CONTEXT: buildPresetRange('CONTEXT', peakMs, videoDurationMs),
    STANDARD: buildPresetRange('STANDARD', peakMs, videoDurationMs),
    LONG: buildPresetRange('LONG', peakMs, videoDurationMs),
  }
}
