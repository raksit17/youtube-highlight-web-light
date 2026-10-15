<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Copy, RefreshCw, Save, Sparkles } from 'lucide-vue-next'
import { highlightApi, isDemoMode } from '@/services/api'
import type { ClipDraft } from '@/types/domain'
import type { YoutubeMetadataDraft, YoutubeMetadataTone } from '@/types/youtube-metadata'

const route = useRoute()
const router = useRouter()
const clip = ref<ClipDraft | null>(null)
const metadata = ref<YoutubeMetadataDraft | null>(null)
const models = ref<string[]>([])
const model = ref('')
const tone = ref<YoutubeMetadataTone>('balanced')
const title = ref('')
const description = ref('')
const tagsText = ref('')
const hashtagsText = ref('')
const loading = ref(true)
const generating = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const modelsError = ref('')

function showDraft(value: YoutubeMetadataDraft) {
  metadata.value = value
  title.value = value.selectedTitle
  description.value = value.description
  tagsText.value = value.tags.join(', ')
  hashtagsText.value = value.hashtags.join(' ')
  tone.value = (['balanced', 'funny', 'seo'].includes(value.tone) ? value.tone : 'balanced') as YoutubeMetadataTone
  if (models.value.includes(value.model)) model.value = value.model
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const clipId = String(route.params.id)
    clip.value = await highlightApi.getClip(clipId)
    if (!isDemoMode) {
      const previous = await highlightApi.getYoutubeMetadata(clipId)
      if (previous) showDraft(previous)
      try {
        const available = await highlightApi.listOllamaModels()
        models.value = available.models
        model.value = (metadata.value?.model && models.value.includes(metadata.value.model))
          ? metadata.value.model
          : (available.defaultModel || available.models[0] || '')
      } catch (e) {
        modelsError.value = e instanceof Error ? e.message : 'Could not contact Ollama.'
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load clip'
  } finally {
    loading.value = false
  }
}

async function generate() {
  if (!clip.value || generating.value || isDemoMode) return
  if (!model.value) {
    error.value = 'Start Ollama and select an installed Qwen model first.'
    return
  }
  if (metadata.value?.isStale && !window.confirm('Clip range changed. Regenerate the metadata for the current timestamps?')) return
  generating.value = true
  error.value = ''
  notice.value = ''
  try {
    const generated = await highlightApi.generateYoutubeMetadata(clip.value.id, { model: model.value, tone: tone.value })
    showDraft(generated)
    notice.value = 'Created new YouTube metadata from this clip transcript. Review all claims before posting.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Metadata generation failed'
  } finally {
    generating.value = false
  }
}

function splitTags(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean)))
}

async function save() {
  if (!clip.value || !metadata.value || saving.value) return
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const updated = await highlightApi.updateYoutubeMetadata(clip.value.id, {
      selectedTitle: title.value,
      description: description.value,
      tags: splitTags(tagsText.value),
      hashtags: Array.from(new Set(hashtagsText.value.split(/[\s,;]+/).filter(Boolean))),
    })
    showDraft(updated)
    notice.value = 'Metadata saved.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not save metadata'
  } finally {
    saving.value = false
  }
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    notice.value = label + ' copied to clipboard.'
  } catch {
    error.value = 'Clipboard is unavailable. Select and copy the text manually.'
  }
}

function selectTitle(value: string) {
  title.value = value
  notice.value = 'Title selected. Click Save metadata to keep your selection.'
}

function back() {
  if (!clip.value) return router.push('/')
  if (clip.value.candidateId) {
    return router.push('/videos/' + encodeURIComponent(clip.value.videoId) + '/clip/' + encodeURIComponent(clip.value.candidateId))
  }
  return router.push('/videos/' + encodeURIComponent(clip.value.videoId))
}

onMounted(() => { void load() })
</script>

<template>
  <div class="metadata-page">
    <button class="button button-outline" type="button" @click="back"><ArrowLeft :size="16" /> Back to clip editor</button>
    <header class="metadata-header">
      <div>
        <span class="metadata-kicker">LOCAL AI / OLLAMA + QWEN</span>
        <h1>YouTube Title & Description</h1>
        <p>Generate Thai titles and descriptions from the exact Clip Draft transcript. Nothing is published automatically.</p>
      </div>
    </header>

    <p v-if="loading" class="card metadata-message">Loading clip and AI metadata...</p>
    <p v-else-if="isDemoMode" class="card metadata-message">Set <code>VITE_DEMO_MODE=false</code> to connect to the NestJS API and Ollama.</p>
    <p v-else-if="!clip" class="card metadata-message">{{ error || 'Clip not found' }}</p>
    <template v-else>
      <div class="metadata-columns">
        <section class="card metadata-panel">
          <h2>AI settings</h2>
          <p class="metadata-help">Clip: {{ clip.title || clip.id }} · {{ Math.round((clip.endMs - clip.startMs) / 1000) }}s</p>
          <label class="field-label">Ollama model
            <select v-model="model" class="text-input" :disabled="generating || models.length === 0">
              <option value="" disabled>Select installed model</option>
              <option v-for="entry in models" :key="entry" :value="entry">{{ entry }}</option>
            </select>
          </label>
          <p v-if="modelsError" class="metadata-error">{{ modelsError }}</p>
          <label class="field-label">Title style
            <select v-model="tone" class="text-input" :disabled="generating">
              <option value="balanced">Balanced — Funny + Reaction + SEO</option>
              <option value="funny">Funny / entertaining</option>
              <option value="seo">Search-focused</option>
            </select>
          </label>
          <p class="metadata-help">Qwen reads subtitle text, highlight context, and a small chat sample. It cannot verify visuals that are absent from the transcript.</p>
          <button class="button button-orange full-width" :disabled="generating || !model" type="button" @click="generate">
            <RefreshCw v-if="generating" :size="17" class="metadata-spin" />
            <Sparkles v-else :size="17" />
            {{ generating ? 'Qwen is analyzing...' : metadata ? 'Regenerate with Qwen' : 'Generate with Qwen' }}
          </button>
          <div v-if="metadata" class="metadata-detail">
            <div><b>Model:</b> {{ metadata.model }}</div>
            <div><b>Prompt:</b> {{ metadata.promptVersion }}</div>
            <div><b>Summary:</b> {{ metadata.summary }}</div>
            <p v-if="metadata.isStale" class="metadata-warning">Clip timestamps have changed since this was generated. Regenerate before uploading.</p>
          </div>
        </section>

        <section class="card metadata-panel">
          <h2>Metadata editor</h2>
          <p v-if="!metadata" class="metadata-help">Generate metadata to see title suggestions, description, hashtags and tags.</p>
          <template v-else>
            <h3>AI title suggestions</h3>
            <div class="metadata-titles">
              <button v-for="(option, i) in metadata.titles" :key="i" class="metadata-title"
                :class="{ chosen: title === option.title }" type="button" @click="selectTitle(option.title)">
                <small>{{ option.style }}</small><strong>{{ option.title }}</strong>
              </button>
            </div>
            <label class="field-label">Selected title ({{ Array.from(title).length }}/100)
              <input v-model="title" class="text-input" maxlength="100" />
            </label>
            <button class="button button-outline" type="button" @click="copy(title, 'Title')"><Copy :size="15" /> Copy title</button>

            <label class="field-label">Description
              <textarea v-model="description" class="text-input metadata-description" rows="11"></textarea>
            </label>
            <p class="metadata-help">UTF-8: {{ new TextEncoder().encode(description).length }}/5000 bytes</p>
            <button class="button button-outline" type="button" @click="copy(description, 'Description')"><Copy :size="15" /> Copy description</button>

            <label class="field-label">Hashtags
              <input v-model="hashtagsText" class="text-input" placeholder="#Hololive #HololiveTH" />
            </label>
            <label class="field-label">YouTube Tags (comma separated)
              <textarea v-model="tagsText" class="text-input" rows="3" placeholder="Hololive, VTuber, Thai Sub"></textarea>
            </label>
            <button class="button button-dark full-width" type="button" :disabled="saving || !title.trim()" @click="save">
              <Save :size="17" /> {{ saving ? 'Saving...' : 'Save metadata' }}
            </button>
          </template>
        </section>
      </div>
    </template>
    <p v-if="notice" role="status" class="metadata-success">{{ notice }}</p>
    <p v-if="error" role="alert" class="metadata-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.metadata-page{display:flex;flex-direction:column;gap:18px;max-width:1320px;margin:auto;padding-bottom:35px}
.metadata-header h1{font-size:27px;margin:6px 0;color:#202a39}
.metadata-header p,.metadata-help{color:#7b8799;font-size:13px;line-height:1.6}
.metadata-kicker{font-size:11px;font-weight:800;letter-spacing:1.3px;color:#f0782d}
.metadata-columns{display:grid;grid-template-columns:minmax(290px,0.8fr) minmax(360px,1.2fr);gap:20px;align-items:start}
.metadata-panel{padding:24px;display:flex;flex-direction:column;gap:16px}
.metadata-panel h2{font-size:20px;margin:0}
.metadata-panel h3{font-size:14px;margin:0}
.metadata-panel .field-label{display:flex;flex-direction:column;gap:8px}
.metadata-title{display:flex;flex-direction:column;text-align:left;gap:6px;padding:12px;border:1px solid #e0e5ed;background:#fff;border-radius:10px;cursor:pointer;font-size:13px}
.metadata-title.chosen{border:2px solid #ef843d;background:#fff7ee}
.metadata-title small{text-transform:uppercase;color:#9aa3b2;font-weight:700}
.metadata-titles{display:grid;gap:8px}
.metadata-description{resize:vertical;min-height:170px;line-height:1.6}
.metadata-detail{font-size:12px;line-height:1.7;color:#5b6575;border-top:1px solid #e2e5ea;padding-top:12px}
.metadata-message{padding:20px}
.metadata-warning{color:#a35a03;background:#fff3d9;border-radius:8px;padding:12px}
.metadata-error{color:#bf3c39;font-size:13px}
.metadata-success{color:#17804b;font-size:13px}
.metadata-spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.metadata-columns{grid-template-columns:1fr}}
</style>
