export type ReviewStatus = 'NEW' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'CLIPPED'
export type RejectReason = 'SPAM' | 'NOT_INTERESTING' | 'REPEATED_EVENT' | 'BAD_CONTEXT' | 'OTHER'
export type MomentCategory = 'FUNNY' | 'SURPRISE' | 'REACTION' | 'CHAT_INTERACTION' | 'CONVERSATION' | string
export type ClipPreset = 'QUICK' | 'CONTEXT' | 'STANDARD' | 'LONG'
export type ClipDraftStatus = 'DRAFT' | 'READY' | 'EXPORTED'
export type RenderFormat = 'MP4' | 'WEBM'
export type RenderResolution = 'ORIGINAL' | '1080P' | '720P'
export type RenderMode = 'ACCURATE' | 'FAST'

export interface RenderOptions {
  format: RenderFormat
  resolution: RenderResolution
  mode: RenderMode
  includeSubtitles: boolean
}

export type RenderJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface RenderJob {
  id: string
  clipId: string
  status: RenderJobStatus
  progress: number
  stage: string
  format: RenderFormat
  resolution: RenderResolution
  mode: RenderMode
  includeSubtitles: boolean
  outputFilename: string | null
  filenameStem: string | null
  subtitleFilename: string | null
  clipStartMs: number | null
  clipEndMs: number | null
  downloadUrl: string | null
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ClipPresetRange {
  label: string
  startMs: number
  endMs: number
  durationMs: number
}
export type ClipPresets = Record<ClipPreset, ClipPresetRange>

export interface ReviewSummary {
  total: number
  new: number
  approved: number
  rejected: number
  clipped: number
}
export interface Video {
  id: string
  provider: string
  externalId: string
  url: string
  title: string
  channelName: string | null
  thumbnailUrl: string | null
  durationMs: number
  chatCount: number
  transcriptCount: number
  createdAt?: string
  analysis: {
    status: 'NOT_STARTED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    candidateCount: number
    highestScore: number | null
    analyzedAt: string | null
  }
  review: ReviewSummary
}
export interface MomentInsights {
  reasonLabel: string
  chatIncreasePercent: number | null
  messageCount: number
  uniqueChatters: number
  laughCount: number
  emojiCount: number
  isPotentialSpam: boolean
  topTerms: string[]
  density?: number[]
}
export interface Candidate {
  id: string
  videoId: string
  rank: number
  startMs: number
  peakMs: number
  endMs: number
  finalScore: number
  category: MomentCategory | null
  status: ReviewStatus
  summary: string | null
  insights: MomentInsights
  clipPresets: ClipPresets
  rejectionReason?: RejectReason | null
}
export interface HeatBucket {
  startMs: number
  endMs: number
  messageCount: number
  normalizedHeat: number
}
export interface Heatmap {
  videoId: string
  durationMs: number
  bucketMs: number
  maxMessageCount: number
  buckets: HeatBucket[]
  markers: Array<{ candidateId: string; rank: number; peakMs: number; score: number }>
}
export interface ContextRow {
  type: 'chat' | 'transcript'
  timestampMs: number
  authorName: string | null
  text: string
}
export interface CandidateContext {
  candidateId: string
  peakMs: number
  rows: ContextRow[]
  chatTotal: number
  truncated: boolean
}
export interface ClipDraft {
  id: string
  videoId: string
  candidateId: string | null
  startMs: number
  endMs: number
  peakMs: number | null
  durationMs: number
  title: string | null
  note: string | null
  status: ClipDraftStatus
  sourcePreset: ClipPreset | null
  isCustomized: boolean
  createdAt?: string
  updatedAt?: string
}
export interface CreateClipPayload {
  candidateId: string
  preset: ClipPreset
  startMs?: number
  endMs?: number
  title?: string
  note?: string
}
export interface UpdateClipPayload {
  startMs?: number
  endMs?: number
  title?: string
  note?: string
  status?: ClipDraftStatus
}
