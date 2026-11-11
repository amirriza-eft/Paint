export function cloneCanvas(source) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0)
  return canvas
}

export function canvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return { x: 0, y: 0 }
  return {
    x: ((clientX - rect.left) * canvas.width) / rect.width,
    y: ((clientY - rect.top) * canvas.height) / rect.height,
  }
}

export function strokeSegment(ctx, x0, y0, x1, y1, color, size) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, size)
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.restore()
}

export function forEachStamp(from, to, spacing, draw) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist === 0) {
    draw(to.x, to.y)
    return
  }
  const step = Math.max(0.35, spacing)
  const steps = Math.ceil(dist / step)
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    draw(from.x + dx * t, from.y + dy * t)
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function isImageFile(file) {
  if (!file) return false
  if (file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|bmp)$/i.test(file.name || '')
}

export function fileBaseName(name) {
  const base = (name || 'Untitled').replace(/\.[^.]+$/, '')
  return base || 'Untitled'
}

export function safeFileName(name) {
  const cleaned = String(name || 'Untitled').replace(/[\\/:*?"<>|]+/g, '').trim()
  return cleaned || 'Untitled'
}

export function extensionFor(format) {
  if (format === 'jpeg') return 'jpg'
  return format
}

export function mimeFor(format) {
  if (format === 'jpg' || format === 'jpeg') return 'image/jpeg'
  if (format === 'webp') return 'image/webp'
  if (format === 'bmp') return 'image/bmp'
  return 'image/png'
}

export function formatFromName(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || '')
  const ext = match ? match[1].toLowerCase() : 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (ext === 'webp') return 'webp'
  if (ext === 'bmp') return 'bmp'
  return 'png'
}
