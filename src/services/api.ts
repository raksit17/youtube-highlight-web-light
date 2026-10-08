import type { Candidate, CandidateContext, ClipDraft, Heatmap, RejectReason, ReviewStatus, Video } from '@/types/domain'
import { demoCandidates, demoContext, demoCreateClip, demoHeatmap, demoUpdateReview, demoVideos } from './demo'

export const isDemoMode = false
const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`API ${response.status}: ${details || response.statusText}`)
  }
  return response.json() as Promise<T>
}

export const highlightApi = {
  async listVideos(): Promise<Video[]> {
    if (isDemoMode) return demoVideos()
    const data = await request<{ items: Video[] }>('/videos?limit=50')
    return data.items
  },
  async getVideo(id: string): Promise<Video> {
    if (isDemoMode) {
      const video = demoVideos().find((v) => v.id === id)
      if (!video) throw new Error('Video not found')
      return video
    }
    return request<Video>(`/videos/${encodeURIComponent(id)}`)
  },
  async listCandidates(id: string): Promise<Candidate[]> {
    if (isDemoMode) return demoCandidates().filter((c) => c.videoId === id)
    const data = await request<{ items: Candidate[] }>(`/videos/${encodeURIComponent(id)}/candidates?sort=score_desc&limit=100`)
    return data.items
  },
  async getHeatmap(id: string): Promise<Heatmap> {
    if (isDemoMode) return demoHeatmap()
    return request<Heatmap>(`/videos/${encodeURIComponent(id)}/heatmap?bucketMs=15000`)
  },
  async getContext(id: string, candidate: Candidate): Promise<CandidateContext> {
    if (isDemoMode) return demoContext(candidate)
    const result = await request<{
      candidateId: string
      peakMs: number
      transcripts?: Array<{ startMs: number; endMs: number; text: string }>
      chats?: Array<{ timestampMs: number; authorName: string | null; message: string }>
      chatTotal?: number
      truncated?: boolean
    }>(`/candidates/${encodeURIComponent(id)}/context?beforeMs=20000&afterMs=20000&chatLimit=100`)
    return {
      candidateId: result.candidateId,
      peakMs: result.peakMs,
      chatTotal: result.chatTotal ?? 0,
      truncated: result.truncated ?? false,
      rows: [
        ...(result.transcripts ?? []).map((t) => ({ type: 'transcript' as const, timestampMs: t.startMs, authorName: 'Transcript', text: t.text })),
        ...(result.chats ?? []).map((m) => ({ type: 'chat' as const, timestampMs: m.timestampMs, authorName: m.authorName, text: m.message })),
      ].sort((a, b) => a.timestampMs - b.timestampMs),
    }
  },
  async reviewCandidate(id: string, status: ReviewStatus, reason?: RejectReason): Promise<Candidate> {
    if (isDemoMode) return demoUpdateReview(id, status, reason)
    return request<Candidate>(`/candidates/${encodeURIComponent(id)}/review`, {
      method: 'PATCH', body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    })
  },
  async createClip(payload: Omit<ClipDraft, 'id' | 'status'>): Promise<ClipDraft> {
    if (isDemoMode) return demoCreateClip(payload)
    return request<ClipDraft>(`/videos/${encodeURIComponent(payload.videoId)}/clips`, {
      method: 'POST', body: JSON.stringify(payload),
    })
  },
}
