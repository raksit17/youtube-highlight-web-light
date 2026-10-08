<script setup lang="ts">
import { Film, Clapperboard, ChartNoAxesCombined, PanelLeftClose, ExternalLink } from 'lucide-vue-next'
import { isDemoMode } from '@/services/api'
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <router-link to="/" class="brand">
        <div class="brand-symbol"><Clapperboard :size="22" :stroke-width="2.5" /></div>
        <div><strong>Highlight<span>Flow</span></strong><small>CLIP REVIEW CONSOLE</small></div>
      </router-link>
      <div class="nav-caption">WORKSPACE</div>
      <nav class="side-nav" aria-label="Main navigation">
        <router-link to="/" exact-active-class="active"><Film :size="19" /> Streams</router-link>
        <router-link to="/analytics" active-class="active"><ChartNoAxesCombined :size="19" /> Analytics <span class="soon">SOON</span></router-link>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-help">
          <div class="sidebar-help-title"><PanelLeftClose :size="17" /> Quick review</div>
          <div><kbd>Space</kbd> Play / Pause</div>
          <div><kbd>↑ ↓</kbd> Navigate moments</div>
          <div><kbd>A</kbd> Approve · <kbd>R</kbd> Reject</div>
          <div><kbd>I</kbd> Start · <kbd>O</kbd> End</div>
        </div>
        <a class="repo-link" href="https://github.com/raksit17/youtube-highlight-api" target="_blank" rel="noreferrer"><ExternalLink :size="15" /> Backend repository</a>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="breadcrumb">WORKSPACE <span>/</span> <strong>{{ $route.name === 'streams' ? 'Streams' : $route.name === 'clip' ? 'Clip editor' : $route.name === 'analytics' ? 'Analytics' : 'Review highlights' }}</strong></div>
        <div class="topbar-right">
          <span v-if="isDemoMode" class="demo-pill"><span class="pulse-dot"></span> DEMO DATA</span>
          <span class="user-avatar">HF</span>
        </div>
      </header>
      <main class="page-content"><router-view /></main>
    </div>
  </div>
</template>
