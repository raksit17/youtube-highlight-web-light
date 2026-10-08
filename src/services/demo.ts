import type { Candidate, CandidateContext, ClipDraft, Heatmap, RejectReason, ReviewStatus, Video } from '@/types/domain'

const videoId = 'demo-big-buck-bunny'
const ytId = 'aqz-KE-bpKQ'
const STATUS_KEY = 'highlight-demo-reviews-v1'
const CLIP_KEY = 'highlight-demo-clips-v1'

const defaultCandidates: Candidate[] = [
  { id: 'moment-1', videoId, rank: 1, startMs: 210000, peakMs: 225000, endMs: 255000, finalScore: 96, category: 'FUNNY', status: 'NEW', summary: 'An unexpected moment prompts an animated response from viewers.', insights: { reasonLabel: 'Laughter spike', chatIncreasePercent: 421, messageCount: 245, uniqueChatters: 113, laughCount: 48, emojiCount: 31, isPotentialSpam: false, topTerms: ['WHAT', 'LMAO', 'NOOO'], density: [4,5,6,6,12,20,34,56,90,100,64,44,25,12] } },
  { id: 'moment-2', videoId, rank: 2, startMs: 365000, peakMs: 380000, endMs: 410000, finalScore: 91, category: 'SURPRISE', status: 'NEW', summary: 'Sudden burst of excitement and surprise.', insights: { reasonLabel: 'Sudden chat burst', chatIncreasePercent: 330, messageCount: 193, uniqueChatters: 84, laughCount: 37, emojiCount: 21, isPotentialSpam: false, topTerms: ['WAIT', 'OMG', 'NO WAY'], density: [5,9,13,30,52,85,98,82,62,27,18,9,6,3] } },
  { id: 'moment-3', videoId, rank: 3, startMs: 109000, peakMs: 124000, endMs: 154000, finalScore: 87, category: 'REACTION', status: 'NEW', summary: 'The chat reacts to a quick change in the scene.', insights: { reasonLabel: 'Strong audience reaction', chatIncreasePercent: 260, messageCount: 155, uniqueChatters: 71, laughCount: 22, emojiCount: 25, isPotentialSpam: false, topTerms: ['WTF', 'HAHA', 'WOW'], density: [3,4,8,22,50,80,97,60,30,19,13,10,5,3] } },
  { id: 'moment-4', videoId, rank: 4, startMs: 473000, peakMs: 488000, endMs: 518000, finalScore: 77, category: 'CHAT_INTERACTION', status: 'NEW', summary: 'Longer conversation with a sustained volume increase.', insights: { reasonLabel: 'Active conversation', chatIncreasePercent: 145, messageCount: 104, uniqueChatters: 61, laughCount: 7, emojiCount: 18, isPotentialSpam: false, topTerms: ['YES', 'TRUE', 'LOOK'], density: [10,12,21,36,52,67,75,78,76,71,61,52,40,25] } },
  { id: 'moment-5', videoId, rank: 5, startMs: 51000, peakMs: 66000, endMs: 96000, finalScore: 66, category: 'CONVERSATION', status: 'NEW', summary: 'A short burst appears to come from repeated messages.', insights: { reasonLabel: 'Possible spam — low author diversity', chatIncreasePercent: 280, messageCount: 90, uniqueChatters: 9, laughCount: 3, emojiCount: 7, isPotentialSpam: true, topTerms: ['HEY', 'HEY', 'HEY'], density: [3,8,5,78,89,95,91,85,10,5,2,1,2,1] } },
]

function getReviews(): Record<string, { status: ReviewStatus; reason?: RejectReason }> {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') } catch { return {} }
}

function getClips(): ClipDraft[] {
  try { return JSON.parse(localStorage.getItem(CLIP_KEY) || '[]') } catch { return [] }
}

export function demoCandidates(): Candidate[] {
  const statuses = getReviews()
  return defaultCandidates.map((item) => ({
    ...item,
    status: statuses[item.id]?.status ?? item.status,
    rejectionReason: statuses[item.id]?.reason ?? null,
  }))
}

export function demoVideos(): Video[] {
  const candidates = demoCandidates()
  const review = {
    total: candidates.length,
    new: candidates.filter((m) => m.status === 'NEW' || m.status === 'REVIEWING').length,
    approved: candidates.filter((m) => m.status === 'APPROVED').length,
    rejected: candidates.filter((m) => m.status === 'REJECTED').length,
    clipped: candidates.filter((m) => m.status === 'CLIPPED').length,
  }
  return [{
    id: videoId,
    provider: 'youtube', externalId: ytId,
    url: `https://www.youtube.com/watch?v=${ytId}`,
    title: 'Big Buck Bunny — Sample Highlight Review',
    channelName: 'Demo project · Synthetic analysis data',
    thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    durationMs: 596000, chatCount: 14516, transcriptCount: 1200,
    analysis: { status: 'COMPLETED', candidateCount: candidates.length, highestScore: 96, analyzedAt: '2026-10-08T03:00:00.000Z' },
    review,
  }]
}

export function demoHeatmap(): Heatmap {
  const durationMs = 596000
  const bucketMs = 15000
  const peaks = defaultCandidates.map((m) => m.peakMs)
  const raw = Array.from({ length: Math.ceil(durationMs / bucketMs) }, (_, i) => {
    const center = i * bucketMs + bucketMs / 2
    const baseline = 4 + Math.round((Math.sin(i * 1.9) + 1) * 5)
    const spikes = peaks.reduce((sum, peak, j) => sum + Math.round([240, 185, 160, 95, 90][j] * Math.exp(-Math.pow((center - peak) / 20000, 2))), 0)
    return { startMs: i * bucketMs, endMs: Math.min((i + 1) * bucketMs, durationMs), messageCount: baseline + spikes }
  })
  const max = Math.max(...raw.map((x) => x.messageCount))
  return { videoId, durationMs, bucketMs, maxMessageCount: max, buckets: raw.map((x) => ({ ...x, normalizedHeat: x.messageCount / max })), markers: defaultCandidates.map((x) => ({ candidateId: x.id, rank: x.rank, peakMs: x.peakMs, score: x.finalScore })) }
}

export function demoContext(candidate: Candidate): CandidateContext {
  const peak = candidate.peakMs
  return {
    candidateId: candidate.id, peakMs: peak, chatTotal: candidate.insights.messageCount, truncated: true,
    rows: [
      { type: 'transcript', timestampMs: peak - 12000, authorName: 'Transcript', text: 'Something is about to happen...' },
      { type: 'chat', timestampMs: peak - 6800, authorName: 'viewer_42', text: candidate.insights.topTerms[0] || 'WOW' },
      { type: 'chat', timestampMs: peak - 3000, authorName: 'viewer_88', text: 'WAIT WHAT' },
      { type: 'transcript', timestampMs: peak - 1000, authorName: 'Transcript', text: '[excited reaction]' },
      { type: 'chat', timestampMs: peak + 800, authorName: 'viewer_12', text: candidate.insights.topTerms[1] || 'OMG' },
      { type: 'chat', timestampMs: peak + 2300, authorName: 'viewer_99', text: candidate.insights.topTerms[2] || 'HAHA' },
      { type: 'chat', timestampMs: peak + 7300, authorName: 'viewer_14', text: 'LOL THAT WAS GOOD' },
    ],
  }
}

export function demoUpdateReview(candidateId: string, status: ReviewStatus, reason?: RejectReason): Candidate {
  const reviews = getReviews()
  reviews[candidateId] = { status, reason }
  localStorage.setItem(STATUS_KEY, JSON.stringify(reviews))
  const candidate = demoCandidates().find((c) => c.id === candidateId)
  if (!candidate) throw new Error('Candidate not found')
  return candidate
}

export function demoCreateClip(input: Omit<ClipDraft, 'id' | 'status'>): ClipDraft {
  const clips = getClips()
  const draft: ClipDraft = { ...input, id: crypto.randomUUID(), status: 'DRAFT' }
  clips.push(draft)
  localStorage.setItem(CLIP_KEY, JSON.stringify(clips))
  return draft
}
