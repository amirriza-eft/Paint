<script setup>
import { onMounted, ref } from 'vue'
import { usePaintStore } from '../../stores/paintStore.js'
import { paint } from '../../services/paintApi.js'
import { formatBytes } from '../../utils/canvasUtils.js'

const store = usePaintStore()
const bytes = ref(null)

onMounted(async () => {
  try {
    bytes.value = await paint.estimateBytes()
  } catch {
    bytes.value = null
  }
})
</script>

<template>
  <div class="dialog">
    <h2>Image properties</h2>
    <dl class="props">
      <dt>File</dt>
      <dd>{{ store.fileName }}</dd>
      <dt>Width</dt>
      <dd>{{ store.width }} px</dd>
      <dt>Height</dt>
      <dd>{{ store.height }} px</dd>
      <dt>Resolution</dt>
      <dd>96 DPI</dd>
      <dt>PNG size</dt>
      <dd>{{ bytes == null ? '…' : formatBytes(bytes) }}</dd>
    </dl>
    <div class="dialog-buttons">
      <button type="button" @click="paint.cancelDialog(); paint.openResize()">Resize…</button>
      <button type="button" @click="paint.cancelDialog()">Close</button>
    </div>
  </div>
</template>
