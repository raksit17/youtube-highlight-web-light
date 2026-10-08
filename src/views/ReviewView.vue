<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReviewStore } from '@/stores/review'
import type { Candidate, RejectReason } from '@/types/domain'
import { formatNumber, formatTime } from '@/utils/time'
import { isDemoMode } from '@/services/api'
import YouTubePlayer from '@/components/YouTubePlayer.vue'
import MomentCard from '@/components/MomentCard.vue'
import HeatTimeline from '@/components/HeatTimeline.vue'
import ContextPanel from '@/components/ContextPanel.vue'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, CircleHelp, Flame, Keyboard, MessageCircle, Pause, Play, RotateCw, Scissors, SkipBack, SkipForward, Users, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useReviewStore()
const player = ref<InstanceType<typeof YouTubePlayer> | null>(null)
const currentMs = ref(0)
const playing = ref(false)
const previewEndMs = ref<number | null>(null)
const pendingClipStartMs = ref<number | null>(null)
const pendingClipEndMs = ref<number | null>(null)
const rejectOpen = ref(false)
const showShortcuts = ref(false)
const toast = ref('')
const filters = [
  { id: 'ALL', text: 'All moments' },
  { id: 'VERY_HOT', text: '🔥 Very hot' },
  { id: 'FUNNY', text: '😂 Funny' },
  { id: 'REACTION', text: '😱 Reaction' },
  { id: 'CHAT', text: '💬 Chat' },
  { id: 'APPROVED', text: '✓ Approved' },
] as const
const rejectReasons: { id: RejectReason; text: string }[] = [
  { id: 'NOT_INTERESTING', text: 'Not interesting' }, { id: 'SPAM', text: 'Spam' },
  { id: 'REPEATED_EVENT', text: 'Repeated event' }, { id: 'BAD_CONTEXT', text: 'Bad context' }, { id: 'OTHER', text: 'Other' },
]
const progressPercent = computed(() => store.candidates.length ? Math.round(store.reviewedCount / store.candidates.length * 100) : 0)
async function preview(candidate: Candidate) {
  rejectOpen.value = false
  pendingClipStartMs.value = null
  pendingClipEndMs.value = null
  await store.select(candidate.id)
  await nextTick()
  const startMs = Math.max(0, candidate.peakMs - 15000)
  previewEndMs.value = Math.min(store.video?.durationMs ?? candidate.peakMs + 30000, candidate.peakMs + 30000)
  player.value?.seekTo(startMs / 1000)
  currentMs.value = startMs
}
async function goToCandidate(id: string) {
  const candidate = store.candidates.find((x) => x.id === id)
  if (candidate) await preview(candidate)
}
async function moveCandidate(delta: number) {
  const moments = store.filteredCandidates
  if (!moments.length) return
  const current = moments.findIndex((x) => x.id === store.selectedId)
  const nextIndex = (current + delta + moments.length) % moments.length
  await preview(moments[nextIndex])
}
async function submitReview(status: 'APPROVED' | 'REJECTED', reason?: RejectReason) {
  if (!store.selected || store.saving) return
  const previous = store.selected.id
  try {
    await store.review(previous, status, reason)
    rejectOpen.value = false
    toast.value = status === 'APPROVED' ? '✓ Moment approved' : '✕ Moment rejected'
    const next = store.nextUnreviewed(previous)
    if (next) await preview(next)
    else player.value?.pause()
  } catch { toast.value = 'Could not save review' }
}
function openClip(candidate?: Candidate | null) {
  const id = candidate?.id ?? store.selectedId
  if (id) router.push({
    path: `/videos/${route.params.id}/clip/${id}`,
    query: {
      ...(pendingClipStartMs.value !== null ? { startMs: String(pendingClipStartMs.value) } : {}),
      ...(pendingClipEndMs.value !== null ? { endMs: String(pendingClipEndMs.value) } : {}),
    },
  })
}
function seekBy(milliseconds: number) {
  const to = Math.max(0, Math.min(store.video?.durationMs ?? Infinity, currentMs.value + milliseconds))
  previewEndMs.value = null
  player.value?.seekTo(to / 1000, false)
  currentMs.value = to
}
function seekTo(milliseconds: number) {
  previewEndMs.value = null
  player.value?.seekTo(milliseconds / 1000, false)
  currentMs.value = milliseconds
}
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (event.ctrlKey || event.altKey || event.metaKey || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName) || target?.isContentEditable) return
  if (event.code === 'Space') { event.preventDefault(); player.value?.toggle(); return }
  if (event.code === 'ArrowDown') { event.preventDefault(); void moveCandidate(1); return }
  if (event.code === 'ArrowUp') { event.preventDefault(); void moveCandidate(-1); return }
  if (event.code === 'KeyJ') seekBy(-5000)
  if (event.code === 'KeyL') seekBy(5000)
  if (event.code === 'KeyA') void submitReview('APPROVED')
  if (event.code === 'KeyR') rejectOpen.value = !rejectOpen.value
  if (event.code === 'KeyI') { pendingClipStartMs.value = Math.round(currentMs.value / 1000) * 1000; toast.value = `Clip start: ${formatTime(pendingClipStartMs.value)}` }
  if (event.code === 'KeyO') { pendingClipEndMs.value = Math.round(currentMs.value / 1000) * 1000; toast.value = `Clip end: ${formatTime(pendingClipEndMs.value)}` }
  if (event.code === 'KeyC') openClip()
}
onMounted(() => { window.addEventListener('keydown', onKeydown); void store.load(String(route.params.id)) })
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
watch(() => route.params.id, (id) => { if (id) void store.load(String(id)) })
</script>

<template>
  <div class="page-inner review-page">
    <div v-if="store.loading" class="card empty-state">Loading highlight review...</div>
    <div v-else-if="store.error && !store.video" class="card empty-state error-text">{{ store.error }} <router-link to="/">Return to Streams</router-link></div>
    <template v-else-if="store.video">
      <div class="review-titlebar"><div class="review-title-left"><router-link to="/" class="back-icon" title="Back to streams"><ArrowLeft :size="20" /></router-link><div><div class="eyebrow">HIGHLIGHT REVIEW <span class="title-separator">/</span> {{ store.video.channelName }}</div><h1>{{ store.video.title }}</h1><div class="video-metadata"><span><Play :size="14" /> {{ formatTime(store.video.durationMs) }}</span><span><MessageCircle :size="14" /> {{ formatNumber(store.video.chatCount) }} chats</span><span class="analysis-ready"><span></span> Analysis complete</span></div></div></div><div class="review-header-actions"><button type="button" class="button button-outline" @click="showShortcuts = !showShortcuts"><Keyboard :size="17" /> Shortcuts</button><button type="button" class="button button-outline" disabled title="Needs analysis job API"><RotateCw :size="17" /> Re-analyze</button></div></div>
      <div v-if="showShortcuts" class="shortcut-banner"><strong>Keyboard controls</strong> Space: play/pause · ↑/↓: moments · J/L: −/+5s · A: approve · R: reject menu · C: clip <button @click="showShortcuts = false" aria-label="Hide shortcuts"><X :size="16" /></button></div>
      <div v-if="isDemoMode" class="banner-demo">Demo mode — preview video is real. Highlight signals and chat context below are illustrative and not derived from this video.</div>
      <div class="review-layout">
        <div class="review-left">
          <section class="card player-panel"><div class="player-header"><span class="player-label"><span class="red-dot"></span> VIDEO PLAYER</span><span v-if="store.selected" class="currently-reviewing">Reviewing <b>#{{ store.selected.rank }}</b> of {{ store.candidates.length }}</span></div>
            <YouTubePlayer ref="player" :video-id="store.video.externalId" :preview-end-ms="previewEndMs" @timeupdate="currentMs = $event" @statechange="playing = $event" />
            <div class="player-tools"><div class="time-display">{{ formatTime(currentMs) }} <span>/ {{ formatTime(store.video.durationMs) }}</span></div><div class="transport"><button title="Back 5s" @click="seekBy(-5000)"><SkipBack :size="18" /></button><button class="transport-play" title="Play / Pause" @click="player?.toggle()"><Pause v-if="playing" :size="18" fill="currentColor" /><Play v-else :size="18" fill="currentColor" /></button><button title="Forward 5s" @click="seekBy(5000)"><SkipForward :size="18" /></button></div><span class="preview-hint">Preview: −15s / +30s</span></div>
          </section>
          <HeatTimeline :heatmap="store.heatmap" :selected-id="store.selectedId" :current-ms="currentMs" @seek="seekTo" @select="goToCandidate" />
          <ContextPanel :context="store.context" :loading="store.contextLoading" />
        </div>
        <aside class="review-right"><div class="card moments-panel"><div class="moment-panel-top"><div><div class="section-heading-with-icon"><Flame :size="21" class="flame-icon" /><h2>Hot moments</h2><span class="moment-count">{{ store.filteredCandidates.length }}</span></div><p>AI-ranked highlights. Best first.</p></div><span class="sort-label">TOP SCORE <ChevronDown :size="14" /></span></div><div class="filter-row"><button v-for="filter in filters" :key="filter.id" class="filter-chip" :class="{ active: store.filter === filter.id }" @click="store.filter = filter.id">{{ filter.text }}</button></div><div class="review-progress-box"><div class="progress-caption"><span>REVIEW PROGRESS</span><strong>{{ store.reviewedCount }} / {{ store.candidates.length }}</strong></div><div class="progress-track"><div :style="{ width: `${progressPercent}%` }"></div></div></div><div class="moment-scroll"><MomentCard v-for="moment in store.filteredCandidates" :key="moment.id" :moment="moment" :active="store.selectedId === moment.id" @preview="preview" @clip="openClip" /><div v-if="!store.filteredCandidates.length" class="empty-inline">No moments match this filter.</div></div>
            <div v-if="store.selected" class="review-action-panel"><div class="action-top"><strong>Decision for #{{ store.selected.rank }}</strong><span><CircleHelp :size="14" /> Review and continue</span></div><div class="review-buttons"><button class="button button-approve" :disabled="store.saving" @click="submitReview('APPROVED')"><Check :size="18" /> Approve <kbd>A</kbd></button><button class="button button-reject" :disabled="store.saving" @click="rejectOpen = !rejectOpen"><X :size="18" /> Reject <kbd>R</kbd></button></div><div v-if="rejectOpen" class="reject-reasons"><span>Why reject?</span><div><button v-for="reason in rejectReasons" :key="reason.id" class="reason-button" @click="submitReview('REJECTED', reason.id)">{{ reason.text }}</button></div></div><button class="clip-link" @click="openClip()"><Scissors :size="15" /> Open clip editor <ArrowRight :size="15" /></button></div>
          </div></aside>
      </div>
      <div v-if="toast" class="toast" role="status" @click="toast = ''">{{ toast }} <X :size="14" /></div>
      <div v-if="store.error" class="error-banner">{{ store.error }}</div>
    </template>
  </div>
</template>
