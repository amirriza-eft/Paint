<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { usePaintStore } from './stores/paintStore.js'
import { paint } from './services/paintApi.js'
import AppHeader from './components/AppHeader.vue'
import RibbonToolbar from './components/RibbonToolbar.vue'
import DrawingCanvas from './components/DrawingCanvas.vue'
import StatusBar from './components/StatusBar.vue'
import DialogHost from './components/DialogHost.vue'
import Icon from './components/Icon.vue'

const store = usePaintStore()

function reopen() {
  store.fileName = 'Untitled'
  store.fileFormat = 'png'
  store.dialog = null
  store.menu = null
  store.message = ''
  store.windowState = 'maximized'
}

paint.reopen = reopen

function onPointerDown(event) {
  if (!event.target.closest?.('[data-menu-root]')) store.menu = null
}

function onBeforeUnload(event) {
  if (store.dirty && store.windowState !== 'closed') {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <div class="desktop" @pointerdown="onPointerDown">
    <section
      v-if="store.windowState !== 'closed'"
      class="paint-window"
      :class="store.windowState"
      aria-label="Paint"
    >
      <AppHeader />
      <RibbonToolbar v-show="store.windowState !== 'minimized'" />
      <DrawingCanvas v-show="store.windowState !== 'minimized'" />
      <StatusBar v-show="store.windowState !== 'minimized'" />
    </section>
    <div v-else class="closed-screen">
      <Icon name="app" :size="48" />
      <p>Paint is closed.</p>
      <button type="button" data-action="reopen" @click="paint.reopen()">Open Paint</button>
    </div>
    <DialogHost />
  </div>
</template>
