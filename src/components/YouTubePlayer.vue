<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { VideoOff } from 'lucide-vue-next'

interface PlayerApi {
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  getCurrentTime(): number
  getPlayerState(): number
  cueVideoById(videoId: string): void
  destroy(): void
}
interface YTApi {
  Player: new (element: HTMLElement, options: object) => PlayerApi
}
declare global {
  interface Window {
    YT?: YTApi
    onYouTubeIframeAPIReady?: () => void
  }
}

const props = defineProps<{ videoId: string; previewEndMs?: number | null }>()
const emit = defineEmits<{ ready: []; timeupdate: [ms: number]; statechange: [playing: boolean] }>()
const mountPoint = ref<HTMLElement | null>(null)
const ready = ref(false)
const error = ref('')
let player: PlayerApi | null = null
let polling: number | null = null
let alive = false
let currentVideoId = props.videoId
let loader: Promise<void> | null = null

function loadYouTube(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (loader) return loader
  loader = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve() }
    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('Could not load YouTube Player API'))
      document.head.appendChild(script)
    }
  })
  return loader
}

async function start() {
  if (!props.videoId || !mountPoint.value) return
  try {
    await loadYouTube()
    if (!alive || !mountPoint.value || !window.YT?.Player) return
    player = new window.YT.Player(mountPoint.value, {
      videoId: props.videoId,
      width: '100%', height: '100%',
      playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
      events: {
        onReady: () => { if (!alive) return; ready.value = true; emit('ready') },
        onStateChange: (event: { data: number }) => emit('statechange', event.data === 1),
        onError: () => { error.value = 'YouTube cannot play this video in an embedded player.' },
      },
    })
  } catch (e) { error.value = e instanceof Error ? e.message : 'Video player unavailable' }
}
function seekTo(seconds: number, autoPlay = true) {
  if (!ready.value || !player) return
  player.seekTo(Math.max(0, seconds), true)
  if (autoPlay) player.playVideo()
}
function play() { if (ready.value) player?.playVideo() }
function pause() { if (ready.value) player?.pauseVideo() }
function toggle() { if (!ready.value || !player) return; player.getPlayerState() === 1 ? pause() : play() }
function getCurrentTime() { return player?.getCurrentTime() ?? 0 }

defineExpose({ seekTo, play, pause, toggle, getCurrentTime, ready })

onMounted(() => {
  alive = true
  void start()
  polling = window.setInterval(() => {
    if (!ready.value || !player) return
    const now = player.getCurrentTime() * 1000
    emit('timeupdate', now)
    if (props.previewEndMs != null && now >= props.previewEndMs && player.getPlayerState() === 1) pause()
  }, 300)
})
watch(() => props.videoId, (id) => {
  if (id && id !== currentVideoId) {
    currentVideoId = id
    if (ready.value) player?.cueVideoById(id)
  }
})
onUnmounted(() => {
  alive = false
  if (polling !== null) window.clearInterval(polling)
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="youtube-frame">
    <div v-if="!videoId" class="player-fallback"><VideoOff :size="36" /><span>No YouTube video ID</span></div>
    <div v-show="!!videoId" ref="mountPoint" class="youtube-target"></div>
    <div v-if="error" class="player-error">{{ error }}</div>
  </div>
</template>
