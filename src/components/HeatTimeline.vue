<script setup lang="ts">
import { computed } from 'vue'
import { Activity } from 'lucide-vue-next'
import type { Heatmap } from '@/types/domain'
import { clamp, formatTime } from '@/utils/time'

const props = defineProps<{ heatmap: Heatmap | null; selectedId: string | null; currentMs: number }>()
const emit = defineEmits<{ seek: [ms: number]; select: [id: string] }>()
const progress = computed(() => props.heatmap?.durationMs ? clamp(props.currentMs / props.heatmap.durationMs * 100, 0, 100) : 0)
function seek(event: MouseEvent) {
  if (!props.heatmap) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const progress = clamp((event.clientX - rect.left) / rect.width, 0, 1)
  emit('seek', progress * props.heatmap.durationMs)
}
</script>
<template>
  <section class="card heat-panel">
    <div class="panel-heading"><div><h3><Activity :size="18" /> Chat heat timeline</h3><p>Jump directly to any spike or ranked moment.</p></div><span class="hint-chip">15s windows</span></div>
    <div v-if="heatmap" class="heat-chart-wrap">
      <div class="heat-chart" role="slider" tabindex="0" aria-label="Video heat timeline" :aria-valuemax="heatmap.durationMs" :aria-valuenow="Math.round(currentMs)" @click="seek" @keydown.left.prevent="emit('seek', Math.max(0, currentMs - 15000))" @keydown.right.prevent="emit('seek', Math.min(heatmap.durationMs, currentMs + 15000))">
        <div class="heat-bars"><div v-for="(bucket,index) in heatmap.buckets" :key="index" class="heat-bar" :class="{ active: bucket.normalizedHeat > .65 }" :style="{ height: `${Math.max(6, bucket.normalizedHeat * 100)}%` }" :title="`${formatTime(bucket.startMs)} · ${bucket.messageCount} chats`"></div></div>
        <div class="playhead" :style="{ left: `${progress}%` }"></div>
        <div class="marker-layer"><button v-for="m in heatmap.markers" :key="m.candidateId" type="button" class="heat-marker" :class="{ selected: selectedId === m.candidateId }" :style="{ left: `${m.peakMs / heatmap.durationMs * 100}%` }" :title="`#${m.rank} · ${formatTime(m.peakMs)}`" @click.stop="emit('select', m.candidateId)">{{ m.rank }}</button></div>
      </div>
      <div class="heat-axis"><span>00:00:00</span><span>{{ formatTime(heatmap.durationMs / 2) }}</span><span>{{ formatTime(heatmap.durationMs) }}</span></div>
      <div class="heat-legend"><span><i class="legend-low"></i> Low activity</span><span><i class="legend-high"></i> High activity</span><span><i class="legend-marker"></i> Highlight marker</span></div>
    </div>
    <p v-else class="empty-inline">Heatmap not available</p>
  </section>
</template>
