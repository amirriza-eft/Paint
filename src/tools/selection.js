import { parseHex } from '../utils/colorUtils.js'
import { cloneCanvas } from '../utils/canvasUtils.js'

export function selectionHandles(sel) {
  const { x, y, w, h } = sel
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  }
}

export function hitSelection(sel, px, py, zoom) {
  const tol = 7 / zoom
  const handles = selectionHandles(sel)
  for (const [name, point] of Object.entries(handles)) {
    if (Math.abs(px - point.x) <= tol && Math.abs(py - point.y) <= tol) return name
  }
  if (px >= sel.x && py >= sel.y && px <= sel.x + sel.w && py <= sel.y + sel.h) return 'move'
  return null
}

export function handleCursor(name) {
  if (name === 'move') return 'move'
  if (name === 'n' || name === 's') return 'ns-resize'
  if (name === 'e' || name === 'w') return 'ew-resize'
  if (name === 'ne' || name === 'sw') return 'nesw-resize'
  if (name === 'nw' || name === 'se') return 'nwse-resize'
  return 'crosshair'
}

export function resizeSelection(start, handle, dx, dy) {
  let { x, y, w, h } = start
  const right = x + w
  const bottom = y + h
  if (handle.includes('w')) x = Math.min(start.x + dx, right - 1)
  if (handle.includes('n')) y = Math.min(start.y + dy, bottom - 1)
  if (handle.includes('e')) w = Math.max(1, start.w + dx)
  if (handle.includes('s')) h = Math.max(1, start.h + dy)
  if (handle.includes('w')) w = right - x
  if (handle.includes('n')) h = bottom - y
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) }
}

export function makeColorTransparent(canvas, hex) {
  const rgb = parseHex(hex)
  if (!rgb) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - rgb.r) <= 12 && Math.abs(data[i + 1] - rgb.g) <= 12 && Math.abs(data[i + 2] - rgb.b) <= 12) {
      data[i + 3] = 0
    }
  }
  ctx.putImageData(image, 0, 0)
}

export function copyCanvasRegion(source, x, y, w, h) {
  const sx = Math.round(x)
  const sy = Math.round(y)
  const sw = Math.max(1, Math.round(w))
  const sh = Math.max(1, Math.round(h))
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  canvas.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return canvas
}

export function applyPolygonMask(canvas, points, originX, originY) {
  const ctx = canvas.getContext('2d')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = point.x - originX
    const y = point.y - originY
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function punchBuffer(ctx, buffer, x, y) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(buffer, Math.round(x), Math.round(y))
  ctx.restore()
}

export function selectionBitmap(sel) {
  if (sel.w === sel.buffer.width && sel.h === sel.buffer.height) return sel.buffer
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sel.w))
  canvas.height = Math.max(1, Math.round(sel.h))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sel.buffer, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function cloneSelectionBuffer(sel) {
  return cloneCanvas(selectionBitmap(sel))
}
