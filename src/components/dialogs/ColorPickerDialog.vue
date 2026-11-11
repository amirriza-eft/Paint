<script setup>
import { computed, ref } from 'vue'
import { PALETTE, hsvToRgb, normalizeHex, parseHex, rgbToHex, rgbToHsv } from '../../utils/colorUtils.js'
import { usePaintStore } from '../../stores/paintStore.js'
import { paint } from '../../services/paintApi.js'

const store = usePaintStore()
const source = store.colorTarget === 'secondary' ? store.secondary : store.primary
const initial = parseHex(source) || { r: 0, g: 0, b: 0 }
const hsv = rgbToHsv(initial.r, initial.g, initial.b)
const hue = ref(hsv.h)
const sat = ref(hsv.s)
const val = ref(hsv.v)
const red = ref(initial.r)
const green = ref(initial.g)
const blue = ref(initial.b)
const hex = ref(rgbToHex(initial.r, initial.g, initial.b))

const hueColor = computed(() => {
  const rgb = hsvToRgb(hue.value, 1, 1)
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
})
const current = computed(() => rgbToHex(red.value, green.value, blue.value))

function fromHsv() {
  const rgb = hsvToRgb(hue.value, sat.value, val.value)
  red.value = rgb.r
  green.value = rgb.g
  blue.value = rgb.b
  hex.value = rgbToHex(rgb.r, rgb.g, rgb.b)
}

function fromRgb() {
  red.value = clampByte(red.value)
  green.value = clampByte(green.value)
  blue.value = clampByte(blue.value)
  const next = rgbToHsv(red.value, green.value, blue.value)
  hue.value = next.h
  sat.value = next.s
  val.value = next.v
  hex.value = rgbToHex(red.value, green.value, blue.value)
}

function fromHex() {
  const rgb = parseHex(hex.value)
  if (!rgb) return
  red.value = rgb.r
  green.value = rgb.g
  blue.value = rgb.b
  const next = rgbToHsv(rgb.r, rgb.g, rgb.b)
  hue.value = next.h
  sat.value = next.s
  val.value = next.v
}

function clampByte(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(255, Math.round(number)))
}

function pickSv(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
  sat.value = rect.width ? x / rect.width : 0
  val.value = rect.height ? 1 - y / rect.height : 0
  fromHsv()
}

function useColor(color) {
  hex.value = color
  fromHex()
}

let drag = false
function startSv(event) {
  drag = true
  pickSv(event)
  window.addEventListener('pointermove', moveSv)
  window.addEventListener('pointerup', endSv)
}
function moveSv(event) {
  if (!drag) return
  const el = document.querySelector('.sv-square')
  if (!el) return
  pickSv({ currentTarget: el, clientX: event.clientX, clientY: event.clientY })
}
function endSv() {
  drag = false
  window.removeEventListener('pointermove', moveSv)
  window.removeEventListener('pointerup', endSv)
}

function save() {
  const next = normalizeHex(hex.value)
  if (!next) return
  paint.applyEditedColor(next)
}
</script>

<template>
  <form class="dialog color-dialog" @submit.prevent="save">
    <h2>Edit colors</h2>
    <p>Editing {{ store.colorTarget === 'secondary' ? 'Color 2' : 'Color 1' }}.</p>
    <div class="picker-layout">
      <div class="sv-wrap">
        <div class="sv-square" :style="{ '--hue': hueColor }" @pointerdown.prevent="startSv">
          <span class="sv-cursor" :style="{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }" />
        </div>
        <input v-model.number="hue" class="hue" type="range" min="0" max="360" step="1" aria-label="Hue" @input="fromHsv" />
      </div>
      <div class="picker-side">
        <div class="preview-pair">
          <span :style="{ background: source }" title="Current" />
          <span :style="{ background: current }" title="New" />
        </div>
        <label>Hex <input v-model="hex" maxlength="7" @change="fromHex" /></label>
        <label>R <input v-model.number="red" type="number" min="0" max="255" @change="fromRgb" /></label>
        <label>G <input v-model.number="green" type="number" min="0" max="255" @change="fromRgb" /></label>
        <label>B <input v-model.number="blue" type="number" min="0" max="255" @change="fromRgb" /></label>
      </div>
    </div>
    <div class="basic-colors">
      <button v-for="color in PALETTE" :key="color" type="button" class="swatch" :style="{ background: color }" :title="color" @click="useColor(color)" />
    </div>
    <div class="dialog-buttons">
      <button type="button" @click="paint.addCustomColor(current)">Add to custom colors</button>
      <button type="submit">OK</button>
      <button type="button" @click="paint.cancelDialog()">Cancel</button>
    </div>
  </form>
</template>
