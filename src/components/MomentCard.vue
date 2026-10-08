<script setup lang="ts">
import { computed } from 'vue'
import { Play, Scissors, CheckCircle2, XCircle, AlertTriangle, Users, Smile, MessageCircle } from 'lucide-vue-next'
import type { Candidate } from '@/types/domain'
import { formatTime } from '@/utils/time'

const props = defineProps<{ moment: Candidate; active: boolean }>()
const emit = defineEmits<{ preview: [moment: Candidate]; clip: [moment: Candidate] }>()
const statusText = computed(() => ({ NEW: 'NEW', REVIEWING: 'REVIEWING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CLIPPED: 'CLIPPED' }[props.moment.status]))
const bars = computed(() => props.moment.insights.density ?? [4, 9, 15, 32, 78, 100, 60, 31, 12, 6])
</script>

<template>
  <article class="moment-card" :class="{ selected: active, 'is-reviewed': moment.status === 'REJECTED' }" @click="emit('preview', moment)">
    <div class="moment-row">
      <div class="moment-rank">#{{ moment.rank }}</div>
      <div class="moment-time">{{ formatTime(moment.peakMs) }}</div>
      <span class="status-badge" :class="moment.status.toLowerCase()">{{ statusText }}</span>
      <div class="score-wrap"><span>HOT SCORE</span><strong>{{ Math.round(moment.finalScore) }}</strong></div>
    </div>
    <div class="moment-label">{{ moment.insights.reasonLabel }}</div>
    <p class="moment-summary">{{ moment.summary || 'Interesting audience reaction near this moment.' }}</p>
    <div class="moment-density" aria-label="Chat density preview">
      <div v-for="(bar, index) in bars" :key="index" class="density-bar" :class="{ hottest: Number(bar) >= 78 }" :style="{ height: `${Math.max(8, Number(bar))}%` }"></div>
    </div>
    <div class="moment-metrics">
      <span><MessageCircle :size="13" /> {{ moment.insights.chatIncreasePercent !== null ? `+${Math.round(moment.insights.chatIncreasePercent)}%` : 'New burst' }}</span>
      <span><Users :size="13" /> {{ moment.insights.uniqueChatters }}</span>
      <span><Smile :size="13" /> {{ moment.insights.laughCount }}</span>
    </div>
    <div v-if="moment.insights.isPotentialSpam" class="spam-warning"><AlertTriangle :size="13" /> Possible spam — low author diversity</div>
    <div class="term-list"><span v-for="(term, index) in moment.insights.topTerms.slice(0, 3)" :key="index">{{ term }}</span></div>
    <div class="moment-actions">
      <button type="button" class="button button-soft button-small" @click.stop="emit('preview', moment)"><Play :size="14" fill="currentColor" /> Preview</button>
      <button type="button" class="button button-outline button-small" @click.stop="emit('clip', moment)"><Scissors :size="14" /> Clip</button>
      <CheckCircle2 v-if="moment.status === 'APPROVED' || moment.status === 'CLIPPED'" class="review-icon approved-icon" :size="18" />
      <XCircle v-else-if="moment.status === 'REJECTED'" class="review-icon rejected-icon" :size="18" />
    </div>
  </article>
</template>
