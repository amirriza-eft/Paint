<script setup>
import { computed } from 'vue'
import { usePaintStore } from '../stores/paintStore.js'
import { usePaintSession } from '../composables/usePaintSession.js'

const store = usePaintStore()
const {
  baseRef,
  overlayRef,
  workspaceRef,
  stackRef,
  fileInputRef,
  textRef,
  textBox,
  textValue,
  canvasCursor,
  eraserStyle,
  ready,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onContextMenu,
  onFileInput,
  onDragOver,
  onDragLeave,
  onDrop,
} = usePaintSession()

const stackStyle = computed(() => ({
  width: `${store.width * store.zoom}px`,
  height: `${store.height * store.zoom}px`,
  cursor: canvasCursor.value,
}))

const textStyle = computed(() => {
  if (!textBox.value) return null
  const zoom = store.zoom
  return {
    left: `${textBox.value.x * zoom}px`,
    top: `${textBox.value.y * zoom}px`,
    width: `${textBox.value.w * zoom}px`,
    height: `${textBox.value.h * zoom}px`,
    fontSize: `${store.fontSize * zoom}px`,
    fontFamily: `"${store.fontFamily}", sans-serif`,
    fontWeight: store.bold ? '700' : '400',
    fontStyle: store.italic ? 'italic' : 'normal',
    textAlign: store.textAlign,
    color: store.primary,
    background: store.textOpaque ? store.secondary : 'transparent',
    lineHeight: '1.2',
  }
})
</script>

<template>
  <div
    ref="workspaceRef"
    class="workspace"
    :data-busy="store.busy ? 'true' : 'false'"
    :class="{ 'drag-over': store.dragOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="workspace-inner">
      <div
        ref="stackRef"
        class="canvas-stack"
        :class="{ pixelated: store.zoom > 1.01 }"
        :style="stackStyle"
        :data-ready="ready ? 'true' : 'false'"
        tabindex="-1"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerLeave"
        @contextmenu="onContextMenu"
      >
        <canvas ref="baseRef" data-canvas="base" width="800" height="600" />
        <canvas ref="overlayRef" data-canvas="overlay" width="800" height="600" />
        <div v-if="eraserStyle" class="eraser-cursor" :style="eraserStyle" />
        <div v-if="textStyle" class="text-box" :style="textStyle">
          <textarea ref="textRef" v-model="textValue" class="text-editor" spellcheck="false" aria-label="Text" />
          <span class="text-handle" />
        </div>
      </div>
    </div>
    <input
      ref="fileInputRef"
      class="file-input"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp"
      @change="onFileInput"
    />
  </div>
</template>
