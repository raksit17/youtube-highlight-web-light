import type { Candidate, CandidateContext, ClipDraft, CreateClipPayload, UpdateClipPayload, Heatmap, RejectReason, ReviewStatus, RenderJob, RenderOptions, Video } from '@/types/domain'
import { demoCandidates, demoContext, demoCreateClip, demoGetClip, demoExportClip, demoHeatmap, demoListClips, demoUpdateClip, demoUpdateReview, demoVideos } from './demo'

export const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false'
const base = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(options.body != null ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`API ${response.status}: ${details || response.statusText}`)
  }
  return response.json() as Promise<T>
}

async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${base}${path}`)
  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`API ${response.status}: ${details || response.statusText}`)
  }
  return response.blob()
}

const enc = (id: string) => encodeURIComponent(id)

export const highlightApi = {
  async listVideos(): Promise<Video[]> {
    if (isDemoMode) return demoVideos()
    return (await request<{ items: Video[] }>('/videos?limit=50')).items
  },
  async getVideo(id: string): Promise<Video> {
    if (isDemoMode) {
      const video = demoVideos().find((v) => v.id === id)
      if (!video) throw new Error('Video not found')
      return video
    }
    return request<Video>(`/videos/${enc(id)}`)
  },
  async listCandidates(id: string): Promise<Candidate[]> {
    if (isDemoMode) return demoCandidates().filter((c) => c.videoId === id)
    // Latest NestJS exposes clipPresets on the candidate response.
    return (await request<{ items: Candidate[] }>(`/videos/${enc(id)}/candidates?sort=score_desc&limit=5`)).items
  },
  async getHeatmap(id: string): Promise<Heatmap> {
    if (isDemoMode) return demoHeatmap()
    return request<Heatmap>(`/videos/${enc(id)}/heatmap?bucketMs=15000`)
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
    }>(`/candidates/${enc(id)}/context?beforeMs=20000&afterMs=20000&chatLimit=100`)
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
    return request<Candidate>(`/candidates/${enc(id)}/review`, {
      method: 'PATCH', body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    })
  },
  async createClip(videoId: string, payload: CreateClipPayload): Promise<ClipDraft> {
    if (isDemoMode) return demoCreateClip(videoId, payload)
    return request<ClipDraft>(`/videos/${enc(videoId)}/clips`, { method: 'POST', body: JSON.stringify(payload) })
  },
  async listClips(videoId: string): Promise<ClipDraft[]> {
    if (isDemoMode) return demoListClips(videoId)
    return (await request<{ items: ClipDraft[] }>(`/videos/${enc(videoId)}/clips`)).items
  },
  async getClip(id: string): Promise<ClipDraft> {
    if (isDemoMode) return demoGetClip(id)
    return request<ClipDraft>(`/clips/${enc(id)}`)
  },
  async updateClip(id: string, payload: UpdateClipPayload): Promise<ClipDraft> {
    if (isDemoMode) return demoUpdateClip(id, payload)
    return request<ClipDraft>(`/clips/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  async exportClip(id: string): Promise<unknown> {
    if (isDemoMode) return demoExportClip(id)
    return request<unknown>(`/clips/${enc(id)}/export`)
  },
  async renderClip(id: string, options: RenderOptions): Promise<RenderJob> {
    if (isDemoMode) throw new Error('Video rendering is only available when VITE_DEMO_MODE=false')
    return request<RenderJob>(`/clips/${enc(id)}/render`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  },
  async getRenderJob(id: string): Promise<RenderJob> {
    if (isDemoMode) throw new Error('Render jobs are only available when VITE_DEMO_MODE=false')
    return request<RenderJob>(`/render-jobs/${enc(id)}`)
  },
  async downloadRenderedClip(id: string): Promise<Blob> {
    if (isDemoMode) throw new Error('Rendered downloads are only available when VITE_DEMO_MODE=false')
    return requestBlob(`/clips/${enc(id)}/download`)
  },
}
