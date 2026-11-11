import { forEachStamp } from '../utils/canvasUtils.js'

export function eraseStroke(ctx, from, to, size) {
  const s = Math.max(1, size)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  const stamp = (x, y) => {
    ctx.fillRect(x - s / 2, y - s / 2, s, s)
  }
  stamp(from.x, from.y)
  forEachStamp(from, to, Math.max(1, s / 6), stamp)
  ctx.restore()
}
