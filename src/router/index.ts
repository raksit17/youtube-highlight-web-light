import { createRouter, createWebHistory } from 'vue-router'
import StreamsView from '@/views/StreamsView.vue'
import ReviewView from '@/views/ReviewView.vue'
import ClipView from '@/views/ClipView.vue'
import AnalyticsView from '@/views/AnalyticsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'streams', component: StreamsView },
    { path: '/videos/:id', name: 'review', component: ReviewView },
    { path: '/videos/:id/clip/:candidateId', name: 'clip', component: ClipView },
    { path: '/analytics', name: 'analytics', component: AnalyticsView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() { return { top: 0 } },
})
