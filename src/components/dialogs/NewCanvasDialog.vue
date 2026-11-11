<script setup>
import { ref } from 'vue'
import { usePaintStore } from '../../stores/paintStore.js'
import { paint } from '../../services/paintApi.js'
import { MAX_EDGE } from '../../utils/imageUtils.js'

const store = usePaintStore()
const width = ref(store.width)
const height = ref(store.height)
const presets = [
  [640, 480],
  [800, 600],
  [1024, 768],
  [1280, 720],
  [1920, 1080],
]
</script>

<template>
  <form class="dialog" @submit.prevent="paint.createNew(width, height)">
    <h2>New</h2>
    <p>Choose the size of the new image.</p>
    <div class="fields">
      <label>Width <input v-model.number="width" type="number" min="1" :max="MAX_EDGE" required /></label>
      <label>Height <input v-model.number="height" type="number" min="1" :max="MAX_EDGE" required /></label>
    </div>
    <div class="presets">
      <button v-for="[w, h] in presets" :key="`${w}x${h}`" type="button" @click="width = w; height = h">{{ w }} × {{ h }}</button>
    </div>
    <p v-if="width * height > 1920 * 1080" class="hint">Large canvases use more memory. History keeps fewer steps.</p>
    <div class="dialog-buttons">
      <button type="submit">OK</button>
      <button type="button" @click="paint.cancelDialog()">Cancel</button>
    </div>
  </form>
</template>
