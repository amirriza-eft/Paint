<script setup>
import { computed } from 'vue'
import { usePaintStore } from '../stores/paintStore.js'
import { paint } from '../services/paintApi.js'
import Icon from './Icon.vue'

const store = usePaintStore()
const percent = computed({
  get: () => Math.round(store.zoom * 100),
  set: (value) => paint.setZoom(Number(value) / 100),
})
const coordinates = computed(() => (
  store.cursorX == null ? '' : `${store.cursorX}, ${store.cursorY}px`
))
</script>

<template>
  <footer class="status-bar">
    <a class="credit" href="https://amirriza.ir" target="_blank" rel="noopener noreferrer">created by amirriza.ir</a>
    <div class="status-message">{{ store.message }}</div>
    <div class="status-dims">{{ store.width }} × {{ store.height }}px</div>
    <div class="status-coords">{{ coordinates }}</div>
    <div class="zoom-controls">
      <button type="button" data-zoom="out" title="Zoom out" aria-label="Zoom out" @click="paint.zoomOut()">
        <Icon name="zoom-out" :size="14" />
      </button>
      <input v-model="percent" data-zoom="slider" type="range" min="12.5" max="800" step="1" aria-label="Zoom" />
      <button type="button" class="zoom-label" data-zoom="reset" title="100%" @click="paint.setZoom(1)">{{ percent }}%</button>
      <button type="button" data-zoom="in" title="Zoom in" aria-label="Zoom in" @click="paint.zoomIn()">
        <Icon name="zoom-in" :size="14" />
      </button>
    </div>
  </footer>
</template>
