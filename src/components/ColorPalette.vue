<script setup>
import { PALETTE } from '../utils/colorUtils.js'
import { usePaintStore } from '../stores/paintStore.js'
import { paint } from '../services/paintApi.js'
import Icon from './Icon.vue'

const store = usePaintStore()

function pick(event, color) {
  if (event.button === 2) store.setSecondary(color)
  else store.setPrimary(color)
}
</script>

<template>
  <div class="colors-block">
    <div class="color-wells">
      <button
        type="button"
        class="well secondary"
        :style="{ background: store.secondary }"
        title="Color 2 (right-click a swatch)"
        aria-label="Color 2"
        @click="paint.editColors('secondary')"
        @contextmenu.prevent="paint.editColors('secondary')"
      />
      <button
        type="button"
        class="well primary"
        :style="{ background: store.primary }"
        title="Color 1"
        aria-label="Color 1"
        @click="paint.editColors('primary')"
        @contextmenu.prevent="paint.editColors('primary')"
      />
      <button type="button" class="swap" title="Swap colors" aria-label="Swap colors" @click="store.swapColors()">
        <Icon name="swap" :size="14" />
      </button>
    </div>
    <div class="swatches" @contextmenu.prevent>
      <button
        v-for="color in PALETTE"
        :key="color"
        type="button"
        class="swatch"
        :data-color="color"
        :style="{ background: color }"
        :title="color"
        :aria-label="`Color ${color}`"
        @pointerdown.prevent="pick($event, color)"
      />
      <button
        v-for="(color, index) in store.customColors"
        :key="`custom-${index}`"
        type="button"
        class="swatch custom"
        :style="{ background: color }"
        title="Custom color"
        :aria-label="`Custom color ${color}`"
        @pointerdown.prevent="pick($event, color)"
      />
    </div>
    <button type="button" class="text-button" @click="paint.editColors('primary')" @contextmenu.prevent="paint.editColors('secondary')">
      Edit colors
    </button>
  </div>
</template>
