<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Download, CheckCircle2, Save, Scissors, SkipBack, SkipForward, Play, RotateCcw, Film, LoaderCircle, RefreshCw } from 'lucide-vue-next'
import { useReviewStore } from '@/stores/review'
import { highlightApi, isDemoMode } from '@/services/api'
import type { ClipDraft, ClipPreset, RenderFormat, RenderJob, RenderMode, RenderResolution } from '@/types/domain'
import { CLIP_PRESET_CONFIG, PRESET_ORDER } from '@/utils/presets'
import { formatTime, parseTime } from '@/utils/time'
import YouTubePlayer from '@/components/YouTubePlayer.vue'

const route = useRoute()
const router = useRouter()
const store = useReviewStore()
const player = ref<InstanceType<typeof YouTubePlayer> | null>(null)
const draft = ref<ClipDraft | null>(null)
const startText = ref('00:00:00')
const endText = ref('00:00:30')
const initialStartText = ref('')
const initialEndText = ref('')
const title = ref('')
const note = ref('')
const resetExactRange = ref<{ startMs: number; endMs: number } | null>(null)
const loading = ref(true)
const saving = ref(false)
const success = ref('')
const error = ref('')
const renderFormat = ref<RenderFormat>('MP4')
const renderResolution = ref<RenderResolution>('1080P')
const renderMode = ref<RenderMode>('ACCURATE')
const includeSubtitles = ref(false)
const renderJob = ref<RenderJob | null>(null)
const renderError = ref('')
const downloading = ref(false)
const downloadingSubtitle = ref(false)
let renderPollTimer: number | undefined
const candidate = computed(() => store.candidates.find((m) => m.id === route.params.candidateId) ?? null)
const sourcePreset = computed(() => draft.value?.sourcePreset ?? store.selectedPreset)
const originalRange = computed(() => candidate.value?.clipPresets[sourcePreset.value])
// Backend ranges may have millisecond precision: preserve them unless the user edits the displayed time.
const startMs = computed(() => startText.value === initialStartText.value && draft.value ? draft.value.startMs : parseTime(startText.value))
const endMs = computed(() => endText.value === initialEndText.value && draft.value ? draft.value.endMs : parseTime(endText.value))
const exactStartMs = computed(() => resetExactRange.value && startText.value === formatTime(resetExactRange.value.startMs) ? resetExactRange.value.startMs : startMs.value)
const exactEndMs = computed(() => resetExactRange.value && endText.value === formatTime(resetExactRange.value.endMs) ? resetExactRange.value.endMs : endMs.value)
const valid = computed(() => exactStartMs.value !== null && exactEndMs.value !== null && exactStartMs.value >= 0 && exactEndMs.value > exactStartMs.value && exactEndMs.value <= (store.video?.durationMs ?? 0) && (draft.value?.peakMs == null || (exactStartMs.value <= draft.value.peakMs && draft.value.peakMs <= exactEndMs.value)))
const isDirty = computed(() => draft.value && (exactStartMs.value !== draft.value.startMs || exactEndMs.value !== draft.value.endMs || title.value !== (draft.value.title ?? '') || note.value !== (draft.value.note ?? '')))
const customized = computed(() => draft.value?.isCustomized || (draft.value && (exactStartMs.value !== originalRange.value?.startMs || exactEndMs.value !== originalRange.value?.endMs)))
const clipDuration = computed(() => valid.value ? formatTime(exactEndMs.value! - exactStartMs.value!) : '--:--:--')
const renderResolutionLabel = computed(() => ({
  ORIGINAL: 'Original',
  '1080P': '1080p — Full HD',
  '720P': '720p — HD',
}[renderResolution.value]))
const renderModeLabel = computed(() => renderMode.value === 'ACCURATE' ? 'Accurate export' : 'Fast export')
const renderOutputLabel = computed(() => `${renderFormat.value} · ${renderResolutionLabel.value} · ${renderModeLabel.value}`)
const renderInProgress = computed(() => renderJob.value?.status === 'QUEUED' || renderJob.value?.status === 'RUNNING')
const renderCompleted = computed(() => renderJob.value?.status === 'COMPLETED')
const renderFailed = computed(() => renderJob.value?.status === 'FAILED')
const renderRequestPreview = computed(() => ({
  clipId: draft.value?.id ?? null,
  format: renderFormat.value,
  resolution: renderResolution.value,
  mode: renderMode.value,
  includeSubtitles: includeSubtitles.value,
  startMs: exactStartMs.value,
  endMs: exactEndMs.value,
  durationMs: valid.value && exactStartMs.value != null && exactEndMs.value != null
    ? exactEndMs.value - exactStartMs.value
    : null,
}))

function stopRenderPolling() {
  if (renderPollTimer !== undefined) {
    window.clearTimeout(renderPollTimer)
    renderPollTimer = undefined
  }
}

async function pollRenderJob(jobId: string) {
  stopRenderPolling()

  try {
    const job = await highlightApi.getRenderJob(jobId)
    renderJob.value = job

    if (job.status === 'COMPLETED') {
      success.value = 'Video render completed. Your file is ready to download.'
      if (draft.value) draft.value = { ...draft.value, status: 'EXPORTED' }
      return
    }

    if (job.status === 'FAILED') {
      renderError.value = job.errorMessage || 'Render failed'
      return
    }

    renderPollTimer = window.setTimeout(() => {
      void pollRenderJob(jobId)
    }, 1000)
  } catch (e) {
    renderError.value = e instanceof Error ? e.message : 'Could not read render progress'
  }
}

async function renderVideo() {
  if (!draft.value || !valid.value || renderInProgress.value) return

  renderError.value = ''
  success.value = ''

  if (isDemoMode) {
    renderError.value = 'Set VITE_DEMO_MODE=false to use the FFmpeg render backend.'
    return
  }

  if (isDirty.value) {
    const saved = await saveDraft()
    if (!saved) return
  }

  try {
    const job = await highlightApi.renderClip(draft.value.id, {
      format: renderFormat.value,
      resolution: renderResolution.value,
      mode: renderMode.value,
      includeSubtitles: includeSubtitles.value,
    })

    renderJob.value = job

    if (job.status === 'COMPLETED') {
      success.value = 'Video render completed. Your file is ready to download.'
      return
    }

    if (job.status === 'FAILED') {
      renderError.value = job.errorMessage || 'Render failed'
      return
    }

    void pollRenderJob(job.id)
  } catch (e) {
    renderError.value = e instanceof Error ? e.message : 'Could not start video render'
  }
}

async function downloadRenderedVideo() {
  if (!draft.value || !renderCompleted.value || downloading.value) return

  downloading.value = true
  renderError.value = ''

  try {
    const blob = await highlightApi.downloadRenderedClip(draft.value.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const extension = renderJob.value?.format === 'WEBM' ? 'webm' : 'mp4'

    link.href = url
    link.download = renderJob.value?.outputFilename || `highlight-${draft.value.id}.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    success.value = 'Rendered video download started.'
  } catch (e) {
    renderError.value = e instanceof Error ? e.message : 'Download failed'
  } finally {
    downloading.value = false
  }
}


async function downloadSubtitle(format: 'srt' | 'vtt') {
  if (!draft.value || !valid.value || downloadingSubtitle.value) return

  if (isDemoMode) {
    error.value = 'Subtitle download requires the NestJS backend.'
    return
  }

  // The server calculates subtitle offsets from the saved Draft range.
  if (isDirty.value) {
    const saved = await saveDraft()
    if (!saved) return
  }

  downloadingSubtitle.value = true
  error.value = ''
  success.value = ''

  try {
    const blob = await highlightApi.downloadSubtitle(draft.value.id, format)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clip-${draft.value.id}.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    success.value = `${format.toUpperCase()} subtitle download started.`
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Subtitle download failed'
  } finally {
    downloadingSubtitle.value = false
  }
}

function applyDraft(value: ClipDraft) {
  draft.value = value
  resetExactRange.value = null
  startText.value = initialStartText.value = formatTime(value.startMs)
  endText.value = initialEndText.value = formatTime(value.endMs)
  title.value = value.title ?? `${store.video?.title ?? 'Highlight'} — #${candidate.value?.rank ?? '?'}`
  note.value = value.note ?? ''
}
async function init() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const videoId = String(route.params.id)
    if (store.video?.id !== videoId) await store.load(videoId)
    if (!store.video) throw new Error(store.error || 'Video not found')
    let clip: ClipDraft
    const draftId = typeof route.query.draftId === 'string' ? route.query.draftId : null
    if (draftId) clip = await highlightApi.getClip(draftId)
    else {
      if (!candidate.value) throw new Error('Candidate not found')
      clip = await highlightApi.createClip(videoId, { candidateId: candidate.value.id, preset: store.selectedPreset })
      await router.replace({ path: route.path, query: { draftId: clip.id } })
    }
    if (clip.videoId !== videoId || (clip.candidateId && clip.candidateId !== String(route.params.candidateId))) {
      throw new Error('This clip draft belongs to a different video or moment')
    }
    applyDraft(clip)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load clip draft'
  } finally { loading.value = false }
}
watch(() => [route.params.id, route.params.candidateId, route.query.draftId], () => {
  stopRenderPolling()
  renderJob.value = null
  renderError.value = ''
  void init()
}, { immediate: true })

watch(renderMode, (mode) => {
  if (mode === 'FAST') renderResolution.value = 'ORIGINAL'
})

onUnmounted(() => stopRenderPolling())
function setStart() { startText.value = formatTime((player.value?.getCurrentTime() ?? 0) * 1000) }
function setEnd() { endText.value = formatTime((player.value?.getCurrentTime() ?? 0) * 1000) }
function preview() { if (startMs.value != null) player.value?.seekTo(startMs.value / 1000) }
function resetRange() {
  if (!originalRange.value) return
  startText.value = formatTime(originalRange.value.startMs)
  endText.value = formatTime(originalRange.value.endMs)
  // Explicitly reset the editing fields to the backend's exact range values on next save.
  resetExactRange.value = { startMs: originalRange.value.startMs, endMs: originalRange.value.endMs }
}
async function saveDraft(status?: 'DRAFT' | 'READY') {
  if (!draft.value || !valid.value || exactStartMs.value == null || exactEndMs.value == null || saving.value) return null
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await highlightApi.updateClip(draft.value.id, {
      startMs: exactStartMs.value, endMs: exactEndMs.value, title: title.value, note: note.value,
      ...(status ? { status } : {}),
    })
    applyDraft(result)
    resetExactRange.value = null
    success.value = status === 'READY' ? 'Clip marked READY.' : 'Clip draft saved to ' + (isDemoMode ? 'browser storage' : 'PostgreSQL') + '.'
    return result
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed'
    return null
  } finally { saving.value = false }
}

async function exportJson() {
  if (!valid.value || !draft.value) return
  // Export only persisted values: save edits before requesting the backend's canonical export.
  if (isDirty.value) { if (!(await saveDraft())) return }
  if (!draft.value) return
  try {
    const result = await highlightApi.exportClip(draft.value.id)
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `highlight-${draft.value.id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    success.value = 'Timestamp JSON exported.'
  } catch (e) { error.value = e instanceof Error ? e.message : 'Export failed' }
}

async function createOtherPreset(preset: ClipPreset) {
  if (!candidate.value || !store.video || saving.value || !confirm('Create a separate draft for this preset? Your existing draft will be kept.')) return
  saving.value = true
  error.value = ''
  try {
    const result = await highlightApi.createClip(store.video.id, { candidateId: candidate.value.id, preset })
    store.setPreset(preset)
    await router.replace({ path: route.path, query: { draftId: result.id } })
  } catch (e) { error.value = e instanceof Error ? e.message : 'Could not create preset draft' }
  finally { saving.value = false }
}
</script>

<template>
  <div class="page-inner clip-page">
    <router-link :to="`/videos/${route.params.id}`" class="back-link"><ArrowLeft :size="17" /> Back to review</router-link>
    <div class="page-header"><div><div class="eyebrow">EDIT YOUR HIGHLIGHT</div><h1>Clip draft <span class="heading-accent">.</span></h1><p>4 ready-made ranges per moment. Customize and save without modifying the source preset.</p></div><span class="draft-label"><Scissors :size="16" /> CLIP MODE</span></div>
    <div v-if="loading" class="card empty-state">Loading clip draft...</div>
    <div v-else-if="!draft || !store.video" class="card empty-state error-text">{{ error || 'Clip draft not found' }} <router-link :to="`/videos/${route.params.id}`">Back to review</router-link></div>
    <div v-else class="clip-layout">
      <section class="card clip-player"><div class="player-header"><span class="player-label">VIDEO PREVIEW</span><span class="hint-chip">Peak {{ formatTime(draft.peakMs ?? 0) }}</span></div><YouTubePlayer ref="player" :video-id="store.video.externalId" :preview-end-ms="valid ? endMs : null" /><div class="clip-transport"><button class="button button-outline" @click="player?.seekTo(Math.max(0, (player?.getCurrentTime() ?? 0) - 5))"><SkipBack :size="17" /> −5s</button><button class="button button-dark" @click="preview"><Play :size="17" /> Preview from start</button><button class="button button-outline" @click="player?.seekTo((player?.getCurrentTime() ?? 0) + 5)"><SkipForward :size="17" /> +5s</button></div><div class="clip-summary-strip"><strong>{{ formatTime(exactStartMs ?? 0) }} → {{ formatTime(exactEndMs ?? 0) }}</strong><span>Peak {{ formatTime(draft.peakMs ?? 0) }}</span><span>{{ clipDuration }}</span></div></section>
      <section class="card clip-settings"><div class="section-heading-with-icon"><Scissors :size="19" class="flame-icon" /><h2>Clip settings</h2></div>
        <div class="preset-section clip-presets"><div class="preset-section-heading"><strong>SOURCE PRESET</strong><span v-if="customized">CUSTOMIZED</span><span v-else>ORIGINAL RANGE</span></div><div class="preset-grid"><button v-for="preset in PRESET_ORDER" :key="preset" class="preset-chip" :class="{ active: sourcePreset === preset }" :disabled="saving || !candidate" @click="preset !== sourcePreset && createOtherPreset(preset)"><strong>{{ CLIP_PRESET_CONFIG[preset].title }}</strong><small>{{ CLIP_PRESET_CONFIG[preset].label }}</small></button></div><p class="preset-help">Changing preset creates a new draft; the existing one is preserved.</p></div>
        <label class="field-label">Clip title<input v-model="title" class="text-input" maxlength="160" placeholder="Clip title" /></label>
        <div class="range-editor"><label class="field-label">Start timestamp<input v-model="startText" class="text-input time-input" placeholder="00:00:00" /></label><button class="button button-soft button-tiny" @click="setStart">Set to current</button><label class="field-label">End timestamp<input v-model="endText" class="text-input time-input" placeholder="00:00:30" /></label><button class="button button-soft button-tiny" @click="setEnd">Set to current</button></div>
        <label class="field-label">Note<textarea v-model="note" class="text-input" rows="2" placeholder="Translation / edit notes"></textarea></label>
        <div class="clip-duration"><span>Selected duration</span><strong>{{ clipDuration }}</strong></div>
        <div class="clip-peak">Peak: <strong>{{ formatTime(draft.peakMs ?? 0) }}</strong> · Source preset: <strong>{{ sourcePreset }}</strong> · {{ customized ? 'Custom range' : 'Original range' }}</div>
        <div v-if="!valid" class="validation-warning">Start must be before End, within video duration, and include the detected peak.</div>
        <button class="button button-outline full-width" :disabled="!originalRange || saving" @click="resetRange"><RotateCcw :size="15" /> Reset to source preset</button>
        <button class="button button-orange full-width" :disabled="!valid || saving" @click="saveDraft()"><Save :size="17" /> {{ saving ? 'Saving...' : 'Save custom draft' }}</button>
        <button class="button button-dark full-width" :disabled="!valid || saving" @click="saveDraft('READY')"><CheckCircle2 :size="17" /> Mark as READY</button>
        <button class="button button-outline full-width" :disabled="!valid || saving" @click="exportJson"><Download :size="17" /> Export timestamps JSON</button>

        <div class="subtitle-export-actions">
          <button
            type="button"
            class="button button-outline"
            :disabled="!valid || saving || downloadingSubtitle || isDemoMode || store.video.transcriptCount <= 0"
            @click="downloadSubtitle('srt')"
          >
            <Download :size="16" /> Export subtitle SRT
          </button>
          <button
            type="button"
            class="button button-outline"
            :disabled="!valid || saving || downloadingSubtitle || isDemoMode || store.video.transcriptCount <= 0"
            @click="downloadSubtitle('vtt')"
          >
            <Download :size="16" /> Export subtitle VTT
          </button>
        </div>
        <p class="subtitle-export-hint">
          Downloads an editable subtitle file rebased to 00:00:00 of the saved clip. Requires transcript data; does not translate automatically.
        </p>


        <div class="render-form">
          <div class="render-form-heading">
            <div>
              <span class="render-kicker">VIDEO EXPORT</span>
              <h3>Render options</h3>
              <p>Create a real video file with the FFmpeg backend, then download it when the render completes.</p>
            </div>
            <span class="render-connected">BACKEND CONNECTED</span>
          </div>

          <div class="render-grid">
            <label class="field-label">Format
              <select v-model="renderFormat" class="text-input">
                <option value="MP4">MP4</option>
                <option value="WEBM">WebM</option>
              </select>
            </label>

            <label class="field-label">Resolution
              <select v-model="renderResolution" class="text-input">
                <option value="1080P" :disabled="renderMode === 'FAST'">1080p — Full HD</option>
                <option value="720P" :disabled="renderMode === 'FAST'">720p — HD</option>
                <option value="ORIGINAL">Original — source resolution</option>
              </select>
            </label>
          </div>

          <div class="render-mode-group">
            <button
              type="button"
              class="render-mode-card"
              :class="{ active: renderMode === 'ACCURATE' }"
              @click="renderMode = 'ACCURATE'"
            >
              <strong>Accurate Export</strong>
              <span>Re-encode with FFmpeg for precise Start / End timestamps.</span>
              <small>Recommended for translated clips</small>
            </button>
            <button
              type="button"
              class="render-mode-card"
              :class="{ active: renderMode === 'FAST' }"
              @click="renderMode = 'FAST'"
            >
              <strong>Fast Export</strong>
              <span>Stream copy when possible. Faster, but cuts can move to nearby keyframes.</span>
              <small>Best for quick previews</small>
            </button>
          </div>

          <label class="render-checkbox" :class="{ disabled: store.video.transcriptCount <= 0 }">
            <input v-model="includeSubtitles" type="checkbox" :disabled="store.video.transcriptCount <= 0" />
            <span>
              <strong>Embed subtitle track in rendered video</strong>
              <small v-if="store.video.transcriptCount > 0">Use subtitle data when a supported subtitle source is available.</small>
              <small v-else>No transcript/subtitle source is available for this video.</small>
            </span>
          </label>

          <div class="render-summary">
            <div><span>Clip range</span><strong>{{ formatTime(exactStartMs ?? 0) }} → {{ formatTime(exactEndMs ?? 0) }}</strong></div>
            <div><span>Duration</span><strong>{{ clipDuration }}</strong></div>
            <div><span>Output</span><strong>{{ renderOutputLabel }}</strong></div>
          </div>

          <details class="render-request-preview">
            <summary>Planned render request payload</summary>
            <pre>{{ JSON.stringify(renderRequestPreview, null, 2) }}</pre>
          </details>

          <div class="render-placeholder">
            Flow: <code>POST /api/v1/clips/:id/render</code> → Render Job → FFmpeg Worker → Download.
          </div>

          <button
            v-if="!renderInProgress && !renderCompleted"
            type="button"
            class="button button-orange full-width render-start-button"
            :disabled="!valid || saving"
            @click="renderVideo"
          >
            <Film :size="17" />
            {{ renderFailed ? 'Retry render video' : 'Render video' }}
          </button>

          <div v-if="renderJob" class="render-job-card" :class="renderJob.status.toLowerCase()">
            <div class="render-job-header">
              <div>
                <span>RENDER JOB</span>
                <strong>{{ renderJob.stage }}</strong>
              </div>
              <b>{{ renderJob.progress }}%</b>
            </div>

            <div class="render-progress-track">
              <div :style="{ width: `${renderJob.progress}%` }"></div>
            </div>

            <div class="render-job-meta">
              <span>{{ renderJob.status }}</span>
              <span>{{ renderJob.format }}</span>
              <span>{{ renderJob.resolution }}</span>
              <span>{{ renderJob.mode }}</span>
            </div>

            <p v-if="renderInProgress" class="render-job-note">
              <LoaderCircle :size="14" class="spin-icon" />
              FFmpeg is rendering this clip. This page checks progress automatically.
            </p>

            <p v-if="renderFailed" class="render-job-error">
              {{ renderJob.errorMessage || renderError || 'Render failed.' }}
            </p>
          </div>

          <button
            v-if="renderCompleted"
            type="button"
            class="button button-dark full-width render-download-button"
            :disabled="downloading"
            @click="downloadRenderedVideo"
          >
            <Download :size="17" />
            {{ downloading ? 'Preparing download...' : `Download ${renderJob?.format ?? 'video'}` }}
          </button>

          <button
            v-if="renderCompleted"
            type="button"
            class="button button-outline full-width"
            @click="renderJob = null; renderError = ''"
          >
            <RefreshCw :size="15" />
            Render another version
          </button>

          <p v-if="renderError && !renderFailed" class="render-job-error">{{ renderError }}</p>
        </div>

        <p v-if="success" class="save-success"><CheckCircle2 :size="16" /> {{ success }}</p><p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="isDemoMode" class="demo-note">Demo mode: clip drafts are saved locally, not in PostgreSQL.</p>
      </section>
    </div>
  </div>
</template>
