<script setup>
import { usePaintStore } from '../stores/paintStore.js'
import { paint } from '../services/paintApi.js'
import NewCanvasDialog from './dialogs/NewCanvasDialog.vue'
import ResizeDialog from './dialogs/ResizeDialog.vue'
import ColorPickerDialog from './dialogs/ColorPickerDialog.vue'
import SaveDialog from './dialogs/SaveDialog.vue'
import PropertiesDialog from './dialogs/PropertiesDialog.vue'
import UnsavedDialog from './dialogs/UnsavedDialog.vue'

const store = usePaintStore()
const dialogs = {
  new: NewCanvasDialog,
  resize: ResizeDialog,
  colors: ColorPickerDialog,
  save: SaveDialog,
  properties: PropertiesDialog,
  unsaved: UnsavedDialog,
}
</script>

<template>
  <div v-if="store.dialog && dialogs[store.dialog]" class="modal-backdrop" @pointerdown.self="paint.cancelDialog()">
    <component :is="dialogs[store.dialog]" />
  </div>
</template>
