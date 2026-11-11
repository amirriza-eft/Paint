<script setup>
import { paint } from '../services/paintApi.js'
import { usePaintStore } from '../stores/paintStore.js'
import Icon from './Icon.vue'

const store = usePaintStore()
</script>

<template>
  <div class="qat" role="toolbar" aria-label="Quick access">
    <button type="button" title="Save (Ctrl+S)" aria-label="Save" data-action="save" @click="paint.save()">
      <Icon name="save" :size="16" />
    </button>
    <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" data-action="undo" :disabled="!store.canUndo" @click="paint.undo()">
      <Icon name="undo" :size="16" />
    </button>
    <button type="button" title="Redo (Ctrl+Y)" aria-label="Redo" data-action="redo" :disabled="!store.canRedo" @click="paint.redo()">
      <Icon name="redo" :size="16" />
    </button>
  </div>
</template>
