<script setup lang="ts">
import { ChartNoAxesCombined } from 'lucide-vue-next'
</script>
<template><div class="page-inner"><div class="page-header"><div><div class="eyebrow">DEVELOPER TOOLS</div><h1>Analytics <span class="heading-accent">.</span></h1><p>Detailed model diagnostics belong here—not on the main review screen.</p></div></div><div class="card empty-state"><ChartNoAxesCombined :size="42" /><h2>Coming in Phase 3</h2><p>Compare spike scores, classification quality, rejection rates and model versions.</p><router-link class="button button-dark" to="/">Back to streams</router-link></div></div></template>
