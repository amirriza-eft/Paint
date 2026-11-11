<script setup>
import { computed } from 'vue'
import { usePaintStore } from '../stores/paintStore.js'
import { paint } from '../services/paintApi.js'
import Icon from './Icon.vue'
import QuickAccessToolbar from './QuickAccessToolbar.vue'

const store = usePaintStore()
const title = computed(() => `${store.dirty ? '*' : ''}${store.fileName} - Paint`)
</script>

<template>
  <header class="titlebar" @dblclick="paint.toggleMaximize()">
    <div class="title-left">
      <div class="menu-anchor" data-menu-root>
        <button
          type="button"
          class="file-button"
          data-menu="file"
          title="File menu"
          aria-label="File menu"
          aria-haspopup="menu"
          :aria-expanded="store.menu === 'file'"
          @click="paint.toggleMenu('file')"
        >
          <Icon name="app" :size="16" />
          <span>File</span>
        </button>
        <div v-if="store.menu === 'file'" class="menu" role="menu">
          <button type="button" role="menuitem" data-action="new" @click="paint.newImage()">New <span>Ctrl+N</span></button>
          <button type="button" role="menuitem" data-action="open" @click="paint.open()">Open <span>Ctrl+O</span></button>
          <button type="button" role="menuitem" data-action="save" @click="paint.save()">Save <span>Ctrl+S</span></button>
          <button type="button" role="menuitem" data-action="save-as" @click="paint.saveAs()">Save as <span>Ctrl+Shift+S</span></button>
          <hr />
          <button type="button" role="menuitem" data-action="print" @click="paint.printImage()">Print <span>Ctrl+P</span></button>
          <button type="button" role="menuitem" data-action="properties" @click="paint.openProperties()">Properties</button>
          <hr />
          <button type="button" role="menuitem" data-action="exit" @click="paint.exit()">Exit</button>
        </div>
      </div>
      <strong class="app-name">Paint</strong>
      <QuickAccessToolbar />
    </div>
    <div class="title-text">{{ title }}</div>
    <div class="window-controls">
      <button type="button" title="Minimize" aria-label="Minimize" @click="paint.minimize()">
        <Icon name="minimize" :size="14" />
      </button>
      <button type="button" :title="store.windowState === 'maximized' ? 'Restore' : 'Maximize'" :aria-label="store.windowState === 'maximized' ? 'Restore' : 'Maximize'" @click="paint.toggleMaximize()">
        <Icon :name="store.windowState === 'maximized' ? 'restore' : 'maximize'" :size="14" />
      </button>
      <button type="button" class="close-button" title="Close" aria-label="Close" @click="paint.close()">
        <Icon name="close" :size="14" />
      </button>
    </div>
  </header>
</template>
