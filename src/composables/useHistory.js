import { cloneCanvas } from '../utils/canvasUtils.js'

const MAX_BYTES = 96 * 1024 * 1024
const MAX_ITEMS = 30

export function createHistory() {
  let past = []
  let future = []
  let bytes = 0
  let serial = 0
  let savedSerial = 0
  let savedLost = false

  function weight(canvas) {
    return canvas.width * canvas.height * 4
  }

  function release(item) {
    bytes -= weight(item.canvas)
    item.canvas.width = 0
    item.canvas.height = 0
  }

  function trim() {
    while ((past.length > MAX_ITEMS || bytes > MAX_BYTES) && past.length > 1) {
      const old = past.shift()
      if (old.serial === savedSerial) savedLost = true
      release(old)
    }
  }

  function dropFuture() {
    for (const item of future) {
      if (item.serial === savedSerial) savedLost = true
      release(item)
    }
    future = []
  }

  return {
    reset(canvas) {
      ;[...past, ...future].forEach(release)
      past = []
      future = []
      bytes = 0
      serial = 0
      savedSerial = 0
      savedLost = false
      const snap = cloneCanvas(canvas)
      past.push({ canvas: snap, serial: 0 })
      bytes += weight(snap)
    },
    push(canvas) {
      dropFuture()
      serial += 1
      const snap = cloneCanvas(canvas)
      past.push({ canvas: snap, serial })
      bytes += weight(snap)
      trim()
    },
    undo() {
      if (past.length < 2) return null
      future.push(past.pop())
      const item = past[past.length - 1]
      serial = item.serial
      return item.canvas
    },
    redo() {
      if (!future.length) return null
      const item = future.pop()
      past.push(item)
      serial = item.serial
      return item.canvas
    },
    current() {
      return past[past.length - 1]?.canvas || null
    },
    markSaved() {
      savedSerial = serial
      savedLost = false
    },
    get dirty() {
      return savedLost || serial !== savedSerial
    },
    get canUndo() {
      return past.length > 1
    },
    get canRedo() {
      return future.length > 0
    },
  }
}
