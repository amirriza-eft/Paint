<script setup>
import { ref, watch } from 'vue'
import { usePaintStore } from '../../stores/paintStore.js'
import { paint } from '../../services/paintApi.js'
import { MAX_EDGE } from '../../utils/imageUtils.js'

const store = usePaintStore()
const mode = ref('pixels')
const width = ref(store.width)
const height = ref(store.height)
const percentW = ref(100)
const percentH = ref(100)
const lock = ref(true)
const skewH = ref(0)
const skewV = ref(0)
const ratio = store.width / store.height

watch(width, (value) => {
  if (lock.value && mode.value === 'pixels' && value > 0) height.value = Math.max(1, Math.round(value / ratio))
})
watch(percentW, (value) => {
  if (lock.value && mode.value === 'percent') percentH.value = value
})

function submit() {
  if (mode.value === 'percent') {
    paint.applyResize({
      width: Math.round(store.width * percentW.value / 100),
      height: Math.round(store.height * percentH.value / 100),
      skewH: skewH.value,
      skewV: skewV.value,
    })
    return
  }
  paint.applyResize({ width: width.value, height: height.value, skewH: skewH.value, skewV: skewV.value })
}
</script>

<template>
  <form class="dialog" @submit.prevent="submit">
    <h2>Resize and skew</h2>
    <fieldset>
      <legend>Resize</legend>
      <label><input v-model="mode" type="radio" value="pixels" /> Pixels</label>
      <label><input v-model="mode" type="radio" value="percent" /> Percentage</label>
      <div v-if="mode === 'pixels'" class="fields">
        <label>Horizontal <input v-model.number="width" type="number" min="1" :max="MAX_EDGE" required /></label>
        <label>Vertical <input v-model.number="height" type="number" min="1" :max="MAX_EDGE" required /></label>
      </div>
      <div v-else class="fields">
        <label>Horizontal <input v-model.number="percentW" type="number" min="1" max="800" required /> %</label>
        <label>Vertical <input v-model.number="percentH" type="number" min="1" max="800" required /> %</label>
      </div>
      <label class="check-row"><input v-model="lock" type="checkbox" /> Maintain aspect ratio</label>
    </fieldset>
    <fieldset>
      <legend>Skew (degrees)</legend>
      <div class="fields">
        <label>Horizontal <input v-model.number="skewH" type="number" min="-80" max="80" step="1" /></label>
        <label>Vertical <input v-model.number="skewV" type="number" min="-80" max="80" step="1" /></label>
      </div>
    </fieldset>
    <div class="dialog-buttons">
      <button type="submit">OK</button>
      <button type="button" @click="paint.cancelDialog()">Cancel</button>
    </div>
  </form>
</template>
