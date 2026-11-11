import { strokeSegment } from '../utils/canvasUtils.js'

export function drawPencil(ctx, from, to, color, size) {
  const width = Math.max(1, size)
  if (width <= 1) {
    strokeSegment(ctx, Math.round(from.x) + 0.5, Math.round(from.y) + 0.5, Math.round(to.x) + 0.5, Math.round(to.y) + 0.5, color, 1)
    return
  }
  strokeSegment(ctx, from.x, from.y, to.x, to.y, color, width)
}
