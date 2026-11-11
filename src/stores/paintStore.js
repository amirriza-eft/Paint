import { defineStore } from 'pinia'

let messageTimer = 0

export const usePaintStore = defineStore('paint', {
  state: () => ({
    fileName: 'Untitled',
    fileFormat: 'png',
    dirty: false,
    width: 800,
    height: 600,
    zoom: 1,
    tool: 'pencil',
    brush: 'round',
    shape: 'rect',
    shapeFill: 'outline',
    size: 2,
    primary: '#000000',
    secondary: '#FFFFFF',
    customColors: Array.from({ length: 10 }, () => '#FFFFFF'),
    fontFamily: 'Segoe UI',
    fontSize: 20,
    bold: false,
    italic: false,
    textAlign: 'left',
    textOpaque: false,
    transparentSelection: false,
    cursorX: null,
    cursorY: null,
    canUndo: false,
    canRedo: false,
    hasSelection: false,
    dialog: null,
    colorTarget: 'primary',
    menu: null,
    windowState: 'maximized',
    message: '',
    busy: false,
    dragOver: false,
  }),
  actions: {
    setMessage(text) {
      this.message = text
      window.clearTimeout(messageTimer)
      if (!text) return
      messageTimer = window.setTimeout(() => {
        if (this.message === text) this.message = ''
      }, 3500)
    },
    setPrimary(color) {
      this.primary = color
    },
    setSecondary(color) {
      this.secondary = color
    },
    swapColors() {
      const next = this.primary
      this.primary = this.secondary
      this.secondary = next
    },
  },
})
