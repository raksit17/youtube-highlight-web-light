<script setup lang="ts">
import { MessageSquareText, FileText, Flame } from 'lucide-vue-next'
import type { CandidateContext } from '@/types/domain'
import { formatTime } from '@/utils/time'

const props = defineProps<{ context: CandidateContext | null; loading: boolean }>()
</script>
<template>
  <section class="card context-panel">
    <div class="panel-heading"><div><h3><MessageSquareText :size="18" /> Around this moment</h3><p>Chat and transcript context around the selected peak.</p></div><span class="hint-chip">±20 sec</span></div>
    <div v-if="loading" class="empty-inline">Loading context...</div>
    <div v-else-if="!context" class="empty-inline">Choose a moment to see the surrounding context.</div>
    <div v-else class="context-list">
      <div v-for="(row,index) in context.rows" :key="index" class="context-line" :class="{ 'peak-context': Math.abs(row.timestampMs - context.peakMs) < 3000 }">
        <div class="context-clock">{{ formatTime(row.timestampMs) }}</div>
        <div class="context-type"><FileText v-if="row.type === 'transcript'" :size="15" /><MessageSquareText v-else :size="15" /></div>
        <div class="context-body"><strong>{{ row.authorName || (row.type === 'chat' ? 'Viewer' : 'Transcript') }}</strong><span>{{ row.text }}</span></div>
        <Flame v-if="Math.abs(row.timestampMs - context.peakMs) < 3000" class="context-flame" :size="15" />
      </div>
      <p v-if="context.truncated" class="context-caption">Showing selected messages near the peak, not all {{ context.chatTotal.toLocaleString() }} chats.</p>
    </div>
  </section>
</template>
