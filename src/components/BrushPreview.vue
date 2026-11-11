<script setup>
import { onMounted, ref, watch } from 'vue'
import { drawBrushPreview } from '../tools/brush.js'

const props = defineProps({
  brush: { type: String, required: true },
})
const canvasRef = ref(null)

function paint() {
  const canvas = canvasRef.value
  if (!canvas) return
  drawBrushPreview(canvas.getContext('2d'), props.brush)
}

onMounted(paint)
watch(() => props.brush, paint)
</script>

<template>
  <canvas ref="canvasRef" class="brush-preview" width="72" height="28" />
</template>
