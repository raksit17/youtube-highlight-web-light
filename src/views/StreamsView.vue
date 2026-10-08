<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays, CheckCircle2, CirclePlay, Film, Flame, Search, SlidersHorizontal } from 'lucide-vue-next'
import { highlightApi, isDemoMode } from '@/services/api'
import type { Video } from '@/types/domain'
import { formatNumber, formatTime } from '@/utils/time'
const videos = ref<Video[]>([])
const loading = ref(true)
const error = ref('')
const query = ref('')
onMounted(async () => { try { videos.value = await highlightApi.listVideos() } catch (e) { error.value = e instanceof Error ? e.message : 'Cannot fetch videos' } finally { loading.value = false } })
</script>
<template>
  <div class="page-inner">
    <div class="page-header"><div><div class="eyebrow">YOUR WORKSPACE</div><h1>Streams library <span class="heading-accent">.</span></h1><p>Find the best moments without watching hours of footage.</p></div><div class="small-date"><CalendarDays :size="16" /> Video review workspace</div></div>
    <div class="overview-strip"><div><span>YOUR STREAMS</span><strong>{{ videos.length }}</strong><small>Ready to review</small></div><div><span>HOT MOMENTS</span><strong>{{ videos.reduce((n,v) => n + v.analysis.candidateCount, 0) }}</strong><small>Automatically detected</small></div><div><span>REVIEWED</span><strong>{{ videos.reduce((n,v) => n + v.review.approved + v.review.rejected + v.review.clipped, 0) }}</strong><small>Processed moments</small></div></div>
    <div class="section-toolbar"><div><h2>All streams</h2><p>Choose a video to start reviewing highlights</p></div><div class="fake-search"><Search :size="16" /><input v-model="query" placeholder="Search streams..." aria-label="Search streams" /><SlidersHorizontal :size="17" /></div></div>
    <div v-if="loading" class="card empty-state">Loading streams...</div><div v-else-if="error" class="card empty-state error-text">{{ error }}</div>
    <div v-else class="stream-grid">
      <article v-for="video in videos.filter(v => `${v.title} ${v.channelName}`.toLowerCase().includes(query.toLowerCase()))" :key="video.id" class="stream-card">
        <div class="stream-thumbnail"><img v-if="video.thumbnailUrl" :src="video.thumbnailUrl" :alt="video.title" /><div v-else class="thumbnail-empty"><Film :size="48" /></div><span class="video-length"><CirclePlay :size="13" /> {{ formatTime(video.durationMs) }}</span></div>
        <div class="stream-body"><div class="stream-status"><span><i></i> ANALYZED</span><span class="muted">YOUTUBE VOD</span></div><h3>{{ video.title }}</h3><p class="stream-channel">{{ video.channelName }}</p><div class="stream-stats"><span><Flame :size="16" /> {{ video.analysis.candidateCount }} moments</span><span><CheckCircle2 :size="16" /> {{ video.review.approved + video.review.rejected + video.review.clipped }} reviewed</span><span>{{ formatNumber(video.chatCount) }} chats</span></div><div class="review-progress"><div :style="{ width: `${video.review.total ? ((video.review.approved + video.review.rejected + video.review.clipped) / video.review.total * 100) : 0}%` }"></div></div><router-link :to="`/videos/${video.id}`" class="button button-dark">Review highlights <ArrowRight :size="17" /></router-link></div>
      </article>
      <div v-if="!videos.length && !loading" class="card empty-state">No videos yet. Import a video using the NestJS ingestion API.</div>
    </div>
    <p v-if="isDemoMode" class="demo-note">Demo: YouTube video is real; highlight scores, chats, transcripts and counts are synthetic examples.</p>
  </div>
</template>
