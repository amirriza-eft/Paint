<script setup>
import { ref } from 'vue'
import { usePaintStore } from '../../stores/paintStore.js'
import { paint } from '../../services/paintApi.js'

const store = usePaintStore()
const name = ref(store.fileName)
const format = ref(store.fileFormat || 'png')
const quality = ref(92)
</script>

<template>
  <form class="dialog" @submit.prevent="paint.confirmSave({ name, format, quality: quality / 100 })">
    <h2>Save as</h2>
    <label class="wide">File name <input v-model="name" required /></label>
    <label class="wide">
      Format
      <select v-model="format">
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
        <option value="webp">WEBP</option>
        <option value="bmp">BMP</option>
      </select>
    </label>
    <label v-if="format === 'jpeg' || format === 'webp'" class="wide">
      Quality {{ quality }}
      <input v-model.number="quality" type="range" min="50" max="100" />
    </label>
    <p v-if="format === 'jpeg'" class="hint">JPEG does not support transparency. Transparent pixels are saved on white.</p>
    <p v-else class="hint">PNG, WEBP, and BMP keep transparent pixels.</p>
    <div class="dialog-buttons">
      <button type="submit">Save</button>
      <button type="button" @click="paint.cancelDialog()">Cancel</button>
    </div>
  </form>
</template>
