import { forEachStamp, strokeSegment } from '../utils/canvasUtils.js'
import { hexToRgba } from '../utils/colorUtils.js'

export const BRUSHES = [
  { id: 'round', label: 'Brush' },
  { id: 'calligraphy', label: 'Calligraphy' },
  { id: 'airbrush', label: 'Airbrush' },
  { id: 'oil', label: 'Oil' },
  { id: 'crayon', label: 'Crayon' },
  { id: 'marker', label: 'Marker' },
  { id: 'watercolor', label: 'Watercolor' },
]

function dab(ctx, brush, x, y, size, color) {
  const radius = Math.max(1, size / 2)
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  if (brush === 'calligraphy') {
    ctx.translate(x, y)
    ctx.rotate(-Math.PI / 4)
    ctx.beginPath()
    ctx.ellipse(0, 0, radius * 1.35, Math.max(0.8, radius * 0.28), 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (brush === 'airbrush') {
    const count = Math.round(10 + radius * 2)
    const spread = radius * 2.4
    const [r, g, b] = hexToRgba(color)
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2
      const d = Math.sqrt(Math.random()) * spread
      ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + Math.random() * 0.22})`
      ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.4, 1.4)
    }
  } else if (brush === 'oil') {
    const [r, g, b] = hexToRgba(color)
    const count = 6
    for (let i = 0; i < count; i += 1) {
      const ox = (Math.random() - 0.5) * radius * 1.4
      const oy = (Math.random() - 0.5) * radius * 1.4
      const jr = Math.max(0, r + (Math.random() - 0.5) * 24)
      const jg = Math.max(0, g + (Math.random() - 0.5) * 24)
      const jb = Math.max(0, b + (Math.random() - 0.5) * 24)
      ctx.globalAlpha = 0.45
      ctx.fillStyle = `rgb(${jr},${jg},${jb})`
      ctx.beginPath()
      ctx.arc(x + ox, y + oy, radius * (0.55 + Math.random() * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (brush === 'crayon') {
    const [r, g, b] = hexToRgba(color)
    const count = Math.round(14 + radius * 5)
    for (let i = 0; i < count; i += 1) {
      const ox = (Math.random() - 0.5) * radius * 2
      const oy = (Math.random() - 0.5) * radius * 2
      if (ox * ox + oy * oy > radius * radius) continue
      ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + Math.random() * 0.6})`
      ctx.fillRect(x + ox, y + oy, 1.5, 1.5)
    }
  } else if (brush === 'watercolor') {
    const [r, g, b] = hexToRgba(color)
    const spread = radius * 2.8
    const ox = (Math.random() - 0.5) * radius * 0.6
    const oy = (Math.random() - 0.5) * radius * 0.6
    const gradient = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, spread)
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.16)`)
    gradient.addColorStop(0.6, `rgba(${r},${g},${b},0.05)`)
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x + ox, y + oy, spread, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawBrush(ctx, brush, from, to, color, size) {
  const s = Math.max(1, size)
  if (brush === 'round') {
    strokeSegment(ctx, from.x, from.y, to.x, to.y, color, s)
    return
  }
  if (brush === 'marker') {
    ctx.save()
    ctx.globalAlpha = 0.28
    ctx.lineCap = 'square'
    ctx.lineJoin = 'miter'
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(4, s * 2.2)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.restore()
    return
  }
  const spacing = {
    calligraphy: s * 0.35,
    airbrush: s * 0.45,
    oil: s * 0.55,
    crayon: Math.max(1, s * 0.18),
    watercolor: s * 0.7,
  }[brush] || s * 0.3
  dab(ctx, brush, from.x, from.y, s, color)
  forEachStamp(from, to, spacing, (x, y) => dab(ctx, brush, x, y, s, color))
}

export function sprayAirbrush(ctx, x, y, color, size) {
  dab(ctx, 'airbrush', x, y, Math.max(1, size), color)
}

export function drawBrushPreview(ctx, brush, color = '#1a1a1a') {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const y = ctx.canvas.height / 2
  const from = { x: 8, y: y + 4 }
  const to = { x: ctx.canvas.width - 8, y: y - 4 }
  drawBrush(ctx, brush, from, to, color, brush === 'watercolor' || brush === 'airbrush' ? 8 : 7)
}
