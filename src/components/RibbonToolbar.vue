<script setup>
import { BRUSHES } from '../tools/brush.js'
import { SHAPES } from '../tools/shapes.js'
import { FONTS } from '../tools/text.js'
import { usePaintStore } from '../stores/paintStore.js'
import { paint } from '../services/paintApi.js'
import Icon from './Icon.vue'
import BrushPreview from './BrushPreview.vue'
import ColorPalette from './ColorPalette.vue'

const store = usePaintStore()

const shapeIcon = {
  line: 'line',
  curve: 'curve',
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  polygon: 'polygon',
  triangle: 'triangle',
  rightTriangle: 'rightTriangle',
  diamond: 'diamond',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  arrow: 'arrow',
  callout: 'callout',
  star: 'star',
}

function toolClass(name) {
  return { active: store.tool === name }
}
</script>

<template>
  <div class="ribbon" role="toolbar" aria-label="Tools">
    <div class="group">
      <div class="group-body clipboard">
        <button type="button" class="big" data-action="paste" title="Paste (Ctrl+V)" @click="paint.paste()">
          <Icon name="paste" :size="28" />
          <span>Paste</span>
        </button>
        <div class="stack">
          <button type="button" data-action="cut" title="Cut (Ctrl+X)" @click="paint.cut()"><Icon name="cut" :size="16" /> Cut</button>
          <button type="button" data-action="copy" title="Copy (Ctrl+C)" @click="paint.copy()"><Icon name="copy" :size="16" /> Copy</button>
          <button type="button" data-action="select-all" title="Select all (Ctrl+A)" @click="paint.selectAll()"><Icon name="select-all" :size="16" /> Select all</button>
        </div>
      </div>
      <div class="group-label">Clipboard</div>
    </div>

    <div class="group">
      <div class="group-body image-tools">
        <div class="menu-anchor split" data-menu-root>
          <button type="button" :class="{ active: store.tool === 'select' || store.tool === 'freeSelect' }" title="Select" data-tool="select" @click="paint.setTool('select')">
            <Icon name="select" :size="18" /> Select
          </button>
          <button type="button" title="Selection options" aria-label="Selection options" @click="paint.toggleMenu('select')">▾</button>
          <div v-if="store.menu === 'select'" class="menu" role="menu">
            <button type="button" role="menuitem" data-tool="select" @click="paint.setTool('select')">Rectangular selection</button>
            <button type="button" role="menuitem" data-tool="freeSelect" @click="paint.setTool('freeSelect')">Free-form selection</button>
            <button type="button" role="menuitem" @click="paint.selectAll()">Select all</button>
            <button type="button" role="menuitem" :disabled="!store.hasSelection" @click="paint.deleteSelection()">Delete selection</button>
            <hr />
            <label class="check-row">
              <input v-model="store.transparentSelection" type="checkbox" />
              Transparent selection
            </label>
          </div>
        </div>
        <button type="button" title="Crop to selection" data-action="crop" :disabled="!store.hasSelection" @click="paint.crop()">
          <Icon name="crop" :size="16" /> Crop
        </button>
        <button type="button" title="Resize and skew" data-action="resize" @click="paint.openResize()">
          <Icon name="resize" :size="16" /> Resize
        </button>
        <div class="menu-anchor" data-menu-root>
          <button type="button" title="Rotate or flip" data-action="rotate" @click="paint.toggleMenu('rotate')">
            <Icon name="rotate" :size="16" /> Rotate
          </button>
          <div v-if="store.menu === 'rotate'" class="menu" role="menu">
            <button type="button" role="menuitem" @click="paint.rotate(90)"><Icon name="rotate" :size="16" /> Rotate right 90°</button>
            <button type="button" role="menuitem" @click="paint.rotate(-90)"><Icon name="rotate" :size="16" /> Rotate left 90°</button>
            <button type="button" role="menuitem" @click="paint.rotate(180)"><Icon name="rotate" :size="16" /> Rotate 180°</button>
            <hr />
            <button type="button" role="menuitem" @click="paint.flip('horizontal')"><Icon name="flip-h" :size="16" /> Flip horizontal</button>
            <button type="button" role="menuitem" @click="paint.flip('vertical')"><Icon name="flip-v" :size="16" /> Flip vertical</button>
          </div>
        </div>
      </div>
      <div class="group-label">Image</div>
    </div>

    <div class="group">
      <div class="group-body tools">
        <button type="button" :class="toolClass('pencil')" data-tool="pencil" title="Pencil" aria-label="Pencil" @click="paint.setTool('pencil')"><Icon name="pencil" /></button>
        <button type="button" :class="toolClass('fill')" data-tool="fill" title="Fill with color" aria-label="Fill with color" @click="paint.setTool('fill')"><Icon name="fill" /></button>
        <button type="button" :class="toolClass('text')" data-tool="text" title="Text" aria-label="Text" @click="paint.setTool('text')"><Icon name="text" /></button>
        <button type="button" :class="toolClass('eraser')" data-tool="eraser" title="Eraser" aria-label="Eraser" @click="paint.setTool('eraser')"><Icon name="eraser" /></button>
        <button type="button" :class="toolClass('picker')" data-tool="picker" title="Color picker" aria-label="Color picker" @click="paint.setTool('picker')"><Icon name="picker" /></button>
        <button type="button" :class="toolClass('magnifier')" data-tool="magnifier" title="Magnifier" aria-label="Magnifier" @click="paint.setTool('magnifier')"><Icon name="magnifier" /></button>
      </div>
      <div class="group-label">Tools</div>
    </div>

    <div class="group">
      <div class="group-body">
        <div class="menu-anchor" data-menu-root>
          <button type="button" class="brush-button" :class="{ active: store.tool === 'brush' }" data-tool="brush" title="Brushes" @click="paint.toggleMenu('brush')">
            <Icon name="brush" :size="22" />
            <span>{{ BRUSHES.find((item) => item.id === store.brush)?.label }}</span>
          </button>
          <div v-if="store.menu === 'brush'" class="menu brush-menu" role="menu">
            <button
              v-for="item in BRUSHES"
              :key="item.id"
              type="button"
              role="menuitem"
              :data-brush="item.id"
              :class="{ active: store.brush === item.id && store.tool === 'brush' }"
              @click="paint.setTool('brush', { brush: item.id })"
            >
              <BrushPreview :brush="item.id" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="group-label">Brushes</div>
    </div>

    <div class="group">
      <div class="group-body shapes">
        <div class="shape-grid">
          <button
            v-for="item in SHAPES"
            :key="item.id"
            type="button"
            :data-shape="item.id"
            :title="item.label"
            :aria-label="item.label"
            :class="{ active: store.tool === 'shape' && store.shape === item.id }"
            @click="paint.setTool('shape', { shape: item.id })"
          >
            <Icon :name="shapeIcon[item.id]" :size="16" />
          </button>
        </div>
        <div class="fill-modes" role="group" aria-label="Shape fill">
          <button type="button" title="Outline" aria-label="Outline" :class="{ active: store.shapeFill === 'outline' }" @click="store.shapeFill = 'outline'"><Icon name="outline" :size="15" /></button>
          <button type="button" title="Outline and fill" aria-label="Outline and fill" :class="{ active: store.shapeFill === 'both' }" @click="store.shapeFill = 'both'"><Icon name="both" :size="15" /></button>
          <button type="button" title="Fill" aria-label="Fill" :class="{ active: store.shapeFill === 'fill' }" @click="store.shapeFill = 'fill'"><Icon name="fill-mode" :size="15" /></button>
        </div>
      </div>
      <div class="group-label">Shapes</div>
    </div>

    <div class="group">
      <div class="group-body size-control">
        <label>
          Size
          <input v-model.number="store.size" data-size type="number" min="1" max="100" />
        </label>
        <input v-model.number="store.size" type="range" min="1" max="100" aria-label="Brush size" />
        <div class="size-preview" aria-hidden="true">
          <span :style="{ height: Math.min(store.size, 28) + 'px' }" />
        </div>
      </div>
      <div class="group-label">Size</div>
    </div>

    <div v-if="store.tool === 'text'" class="group text-group">
      <div class="group-body text-controls">
        <select v-model="store.fontFamily" aria-label="Font family">
          <option v-for="font in FONTS" :key="font" :value="font">{{ font }}</option>
        </select>
        <input v-model.number="store.fontSize" type="number" min="8" max="144" aria-label="Font size" />
        <button type="button" :class="{ active: store.bold }" title="Bold (Ctrl+B)" @click="store.bold = !store.bold">B</button>
        <button type="button" class="italic" :class="{ active: store.italic }" title="Italic (Ctrl+I)" @click="store.italic = !store.italic">I</button>
        <button type="button" :class="{ active: store.textAlign === 'left' }" title="Align left" @click="store.textAlign = 'left'">L</button>
        <button type="button" :class="{ active: store.textAlign === 'center' }" title="Align center" @click="store.textAlign = 'center'">C</button>
        <button type="button" :class="{ active: store.textAlign === 'right' }" title="Align right" @click="store.textAlign = 'right'">R</button>
        <label class="check-row">
          <input v-model="store.textOpaque" type="checkbox" />
          Opaque
        </label>
      </div>
      <div class="group-label">Text</div>
    </div>

    <div class="group colors-group">
      <div class="group-body">
        <ColorPalette />
      </div>
      <div class="group-label">Colors</div>
    </div>
  </div>
</template>
