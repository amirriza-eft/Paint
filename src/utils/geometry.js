export function boundsFromDrag(x0, y0, x1, y1, square = false) {
  let ex = x1
  let ey = y1
  if (square) {
    const dx = x1 - x0
    const dy = y1 - y0
    const side = Math.max(Math.abs(dx), Math.abs(dy))
    ex = x0 + Math.sign(dx || 1) * side
    ey = y0 + Math.sign(dy || 1) * side
  }
  const x = Math.min(x0, ex)
  const y = Math.min(y0, ey)
  return { x, y, w: Math.abs(ex - x0), h: Math.abs(ey - y0), x1: ex, y1: ey }
}

export function constrainAngle(x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  if (len === 0) return { x: x1, y: y1 }
  const angle = Math.atan2(dy, dx)
  const snap = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
  return {
    x: x0 + Math.cos(snap) * len,
    y: y0 + Math.sin(snap) * len,
  }
}

export function regularPolygon(sides, x, y, w, h, rotation = -Math.PI / 2) {
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = w / 2
  const ry = h / 2
  const points = []
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i * 2 * Math.PI) / sides
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  return points
}

export function starPoints(x, y, w, h, points = 5, innerRatio = 0.382) {
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = w / 2
  const ry = h / 2
  const result = []
  const rotation = -Math.PI / 2
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? 1 : innerRatio
    const a = rotation + (i * Math.PI) / points
    result.push([cx + Math.cos(a) * rx * radius, cy + Math.sin(a) * ry * radius])
  }
  return result
}

export function arrowPoints(x0, y0, x1, y1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const head = Math.min(Math.max(len * 0.38, 12), len * 0.55)
  const shaft = Math.max(len * 0.07, 3)
  const headW = shaft * 2.8
  const bx = x1 - ux * head
  const by = y1 - uy * head
  return [
    [x0 + px * shaft, y0 + py * shaft],
    [bx + px * shaft, by + py * shaft],
    [bx + px * headW, by + py * headW],
    [x1, y1],
    [bx - px * headW, by - py * headW],
    [bx - px * shaft, by - py * shaft],
    [x0 - px * shaft, y0 - py * shaft],
  ]
}

export function rightTrianglePoints(x0, y0, x1, y1) {
  return [
    [x0, y0],
    [x1, y0],
    [x0, y1],
  ]
}

export function diamondPoints(x, y, w, h) {
  return [
    [x + w / 2, y],
    [x + w, y + h / 2],
    [x + w / 2, y + h],
    [x, y + h / 2],
  ]
}

export function tracePoints(ctx, points, closed = true) {
  if (!points.length) return
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1])
  if (closed) ctx.closePath()
}

export function polygonBBox(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
