<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ClipboardCopy, CheckCircle2, Save, Scissors, SkipBack, SkipForward, Play } from 'lucide-vue-next'
import { useReviewStore } from '@/stores/review'
import { highlightApi, isDemoMode } from '@/services/api'
import { formatTime, parseTime } from '@/utils/time'
import YouTubePlayer from '@/components/YouTubePlayer.vue'
const route = useRoute()
const router = useRouter()
const store = useReviewStore()
const player = ref<InstanceType<typeof YouTubePlayer> | null>(null)
const startText = ref('00:00:00')
const endText = ref('00:00:30')
const title = ref('')
const saving = ref(false)
const saved = ref('')
const error = ref('')
const candidate = computed(() => store.candidates.find((m) => m.id === route.params.candidateId) ?? null)
const startMs = computed(() => parseTime(startText.value))
const endMs = computed(() => parseTime(endText.value))
const isValid = computed(() => startMs.value !== null && endMs.value !== null && startMs.value >= 0 && endMs.value > startMs.value && endMs.value <= (store.video?.durationMs ?? 0))
const clipDuration = computed(() => isValid.value ? formatTime(endMs.value! - startMs.value!) : '--:--:--')
onMounted(async () => { if (store.video?.id !== String(route.params.id)) await store.load(String(route.params.id)) })
watch(candidate, (moment) => { if (!moment) return; startText.value = formatTime(Number(route.query.startMs) || moment.startMs); endText.value = formatTime(Number(route.query.endMs) || moment.endMs); title.value = `${store.video?.title || 'Highlight'} — #${moment.rank}` }, { immediate: true })
function setStart() { startText.value = formatTime((player.value?.getCurrentTime() ?? 0) * 1000) }
function setEnd() { endText.value = formatTime((player.value?.getCurrentTime() ?? 0) * 1000) }
function preview() { if (startMs.value !== null) player.value?.seekTo(startMs.value / 1000) }
async function save() {
  if (!isValid.value || !candidate.value || !store.video) return
  saving.value = true; error.value = ''; saved.value = ''
  try {
    const result = await highlightApi.createClip({ videoId: store.video.id, candidateId: candidate.value.id, startMs: startMs.value!, endMs: endMs.value!, peakMs: candidate.value.peakMs, title: title.value, reason: candidate.value.insights.reasonLabel })
    saved.value = result.id
  } catch (e) { error.value = e instanceof Error ? e.message : 'Cannot save clip' }
  finally { saving.value = false }
}
async function copyJson() {
  if (!isValid.value || !candidate.value || !store.video) return
  const payload = { videoId: store.video.externalId, startMs: startMs.value, endMs: endMs.value, peakMs: candidate.value.peakMs, title: title.value, reason: candidate.value.insights.reasonLabel }
  try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); saved.value = 'COPIED' }
  catch { error.value = 'Clipboard permission not available' }
}
</script>
<template>
  <div class="page-inner clip-page">
    <router-link :to="`/videos/${route.params.id}`" class="back-link"><ArrowLeft :size="17" /> Back to review</router-link>
    <div class="page-header"><div><div class="eyebrow">EDIT YOUR HIGHLIGHT</div><h1>Clip draft <span class="heading-accent">.</span></h1><p>Adjust timestamps and export a precise clip range.</p></div><span class="draft-label"><Scissors :size="16" /> DRAFT MODE</span></div>
    <div v-if="store.loading" class="card empty-state">Loading clip editor...</div><div v-else-if="!candidate || !store.video" class="card empty-state">Candidate not found.</div>
    <div v-else class="clip-layout"><section class="card clip-player"><div class="player-header"><span class="player-label">VIDEO PREVIEW</span><span class="hint-chip">Peak {{ formatTime(candidate.peakMs) }}</span></div><YouTubePlayer ref="player" :video-id="store.video.externalId" :preview-end-ms="isValid ? endMs : null" /><div class="clip-transport"><button class="button button-outline" @click="player?.seekTo(Math.max(0,(player?.getCurrentTime() ?? 0)-5))"><SkipBack :size="17" /> −5s</button><button class="button button-dark" @click="preview"><Play :size="17" /> Preview from start</button><button class="button button-outline" @click="player?.seekTo((player?.getCurrentTime() ?? 0)+5)"><SkipForward :size="17" /> +5s</button></div></section>
      <section class="card clip-settings"><div class="section-heading-with-icon"><Scissors :size="19" class="flame-icon" /><h2>Clip settings</h2></div><label class="field-label">Clip title<input v-model="title" class="text-input" maxlength="160" placeholder="Enter clip title" /></label><div class="range-editor"><label class="field-label">Start timestamp<input v-model="startText" class="text-input time-input" placeholder="00:00:00" /></label><button class="button button-soft button-tiny" @click="setStart">Set to current</button><label class="field-label">End timestamp<input v-model="endText" class="text-input time-input" placeholder="00:00:30" /></label><button class="button button-soft button-tiny" @click="setEnd">Set to current</button></div><div class="clip-duration"><span>Selected duration</span><strong>{{ clipDuration }}</strong></div><div class="clip-peak">Detected peak: <strong>{{ formatTime(candidate.peakMs) }}</strong> · Score {{ Math.round(candidate.finalScore) }}</div><div v-if="!isValid" class="validation-warning">Enter valid timestamps: Start &lt; End and End must be within video duration.</div><button class="button button-orange full-width" :disabled="!isValid || saving" @click="save"><Save :size="17" /> {{ saving ? 'Saving...' : 'Save clip draft' }}</button><button class="button button-outline full-width" :disabled="!isValid" @click="copyJson"><ClipboardCopy :size="17" /> Export timestamps JSON</button><p v-if="saved" class="save-success"><CheckCircle2 :size="16" /> {{ saved === 'COPIED' ? 'Timestamps copied to clipboard' : 'Clip draft saved: ' + saved }}</p><p v-if="error" class="error-text">{{ error }}</p><p v-if="isDemoMode" class="demo-note">Demo drafts are saved in this browser only. Disable demo mode and implement Clip API to persist in PostgreSQL.</p></section>
    </div>
  </div>
</template>
