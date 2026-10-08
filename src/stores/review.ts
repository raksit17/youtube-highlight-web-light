import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { highlightApi } from '@/services/api'
import type { Candidate, CandidateContext, ClipPreset, Heatmap, RejectReason, ReviewStatus, Video } from '@/types/domain'

function readSavedPreset(): ClipPreset {
  const saved = localStorage.getItem('highlight-preset-v1')
  return saved === 'QUICK' || saved === 'CONTEXT' || saved === 'STANDARD' || saved === 'LONG' ? saved : 'STANDARD'
}

export const useReviewStore = defineStore('review', () => {
  const video = ref<Video | null>(null)
  const candidates = ref<Candidate[]>([])
  const heatmap = ref<Heatmap | null>(null)
  const context = ref<CandidateContext | null>(null)
  const selectedId = ref<string | null>(null)
  const selectedPreset = ref<ClipPreset>(readSavedPreset())
  const loading = ref(false)
  const contextLoading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const filter = ref<'ALL' | 'VERY_HOT' | 'FUNNY' | 'REACTION' | 'CHAT' | 'APPROVED'>('ALL')
  let requestToken = 0

  function setPreset(preset: ClipPreset) {
    selectedPreset.value = preset
    localStorage.setItem('highlight-preset-v1', preset)
  }

  const selected = computed(() => candidates.value.find((c) => c.id === selectedId.value) ?? null)
  const filteredCandidates = computed(() => candidates.value.filter((c) => {
    switch (filter.value) {
      case 'VERY_HOT': return c.finalScore >= 85
      case 'FUNNY': return c.category === 'FUNNY'
      case 'REACTION': return c.category === 'REACTION' || c.category === 'SURPRISE'
      case 'CHAT': return c.category === 'CHAT_INTERACTION' || c.category === 'CONVERSATION'
      case 'APPROVED': return c.status === 'APPROVED' || c.status === 'CLIPPED'
      default: return true
    }
  }).sort((a, b) => b.finalScore - a.finalScore))
  const reviewedCount = computed(() => candidates.value.filter((c) => ['APPROVED', 'REJECTED', 'CLIPPED'].includes(c.status)).length)

  async function load(id: string) {
    loading.value = true
    error.value = ''
    video.value = null
    candidates.value = []
    heatmap.value = null
    context.value = null
    selectedId.value = null
    try {
      const [v, list, heat] = await Promise.all([
        highlightApi.getVideo(id),
        highlightApi.listCandidates(id),
        highlightApi.getHeatmap(id),
      ])
      video.value = v
      candidates.value = list.sort((a, b) => b.finalScore - a.finalScore)
      heatmap.value = heat
      if (candidates.value.length) await select(candidates.value[0].id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Cannot load review data'
    } finally {
      loading.value = false
    }
  }

  async function select(id: string) {
    const candidate = candidates.value.find((c) => c.id === id)
    if (!candidate) return
    selectedId.value = id
    context.value = null
    contextLoading.value = true
    const myRequest = ++requestToken
    try {
      const result = await highlightApi.getContext(id, candidate)
      if (myRequest === requestToken) context.value = result
    } catch (err) {
      if (myRequest === requestToken) error.value = err instanceof Error ? err.message : 'Cannot load context'
    } finally {
      if (myRequest === requestToken) contextLoading.value = false
    }
  }

  async function review(id: string, status: ReviewStatus, reason?: RejectReason) {
    const index = candidates.value.findIndex((item) => item.id === id)
    if (index < 0) return
    saving.value = true
    error.value = ''
    try {
      const updated = await highlightApi.reviewCandidate(id, status, reason)
      candidates.value[index] = { ...candidates.value[index], ...updated }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Save failed'
      throw err
    } finally { saving.value = false }
  }

  function nextUnreviewed(fromId?: string): Candidate | null {
    const all = candidates.value
    const currentIndex = all.findIndex((item) => item.id === fromId)
    for (let step = 1; step <= all.length; step++) {
      const item = all[(currentIndex + step) % all.length]
      if (item && (item.status === 'NEW' || item.status === 'REVIEWING')) return item
    }
    return null
  }

  return { video, candidates, heatmap, context, selectedId, selectedPreset, setPreset, selected, loading, contextLoading, saving, error, filter, filteredCandidates, reviewedCount, load, select, review, nextUnreviewed }
})
