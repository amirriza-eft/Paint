import {
  arrowPoints,
  boundsFromDrag,
  constrainAngle,
  diamondPoints,
  regularPolygon,
  rightTrianglePoints,
  starPoints,
  tracePoints,
} from '../utils/geometry.js'

export const SHAPES = [
  { id: 'line', label: 'Line' },
  { id: 'curve', label: 'Curve' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'roundRect', label: 'Rounded rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'rightTriangle', label: 'Right triangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'pentagon', label: 'Pentagon' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'callout', label: 'Callout' },
  { id: 'star', label: 'Star' },
]

export const OPEN_SHAPES = new Set(['line', 'curve'])

function applyStyle(ctx, style, mode, evenOdd = false) {
  ctx.lineWidth = Math.max(1, style.lineWidth)
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'round'
  ctx.miterLimit = 8
  if (mode === 'fill' || mode === 'both') {
    ctx.fillStyle = mode === 'fill' ? style.foreground : style.background
    ctx.fill(evenOdd ? 'evenodd' : 'nonzero')
  }
  if (mode === 'outline' || mode === 'both') {
    ctx.strokeStyle = style.foreground
    ctx.stroke()
  }
}

function pathRoundRect(ctx, x, y, w, h) {
  const r = Math.max(0, Math.min(16, w / 4, h / 4))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function pathCallout(ctx, x, y, w, h) {
  const bodyBottom = y + h * 0.72
  const r = Math.max(0, Math.min(14, w / 5, (bodyBottom - y) / 3))
  const tailLeft = x + w * 0.18
  const tailTipX = x + w * 0.1
  const tailTipY = y + h
  const tailRight = x + w * 0.4
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, bodyBottom, r)
  ctx.arcTo(x + w, bodyBottom, x, bodyBottom, r)
  ctx.lineTo(tailRight, bodyBottom)
  ctx.lineTo(tailTipX, tailTipY)
  ctx.lineTo(tailLeft, bodyBottom)
  ctx.arcTo(x, bodyBottom, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function shapeEndpoints(shape, x0, y0, x1, y1, shift) {
  if (shape === 'line' || shape === 'arrow') {
    if (!shift) return { x0, y0, x1, y1 }
    const end = constrainAngle(x0, y0, x1, y1)
    return { x0, y0, x1: end.x, y1: end.y }
  }
  const box = boundsFromDrag(x0, y0, x1, y1, shift)
  if (shape === 'rightTriangle') {
    const end = shift ? { x: box.x1, y: box.y1 } : { x: x1, y: y1 }
    return { x0, y0, x1: end.x, y1: end.y, box }
  }
  return { x0, y0, x1, y1, box }
}

export function renderShape(ctx, shape, x0, y0, x1, y1, style) {
  const mode = OPEN_SHAPES.has(shape) ? 'outline' : style.mode
  const ends = shapeEndpoints(shape, x0, y0, x1, y1, style.shift)
  ctx.save()
  if (shape === 'line') {
    ctx.beginPath()
    ctx.moveTo(ends.x0, ends.y0)
    ctx.lineTo(ends.x1, ends.y1)
    applyStyle(ctx, style, 'outline')
    ctx.restore()
    return
  }
  if (shape === 'arrow') {
    tracePoints(ctx, arrowPoints(ends.x0, ends.y0, ends.x1, ends.y1))
    applyStyle(ctx, style, mode)
    ctx.restore()
    return
  }
  if (shape === 'rightTriangle') {
    tracePoints(ctx, rightTrianglePoints(ends.x0, ends.y0, ends.x1, ends.y1))
    applyStyle(ctx, style, mode)
    ctx.restore()
    return
  }

  const { x, y, w, h } = ends.box
  if (w < 0.5 && h < 0.5) {
    ctx.restore()
    return
  }
  if (shape === 'rect') {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
  } else if (shape === 'roundRect') {
    pathRoundRect(ctx, x, y, w, h)
  } else if (shape === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2)
  } else if (shape === 'triangle') {
    tracePoints(ctx, [
      [x + w / 2, y],
      [x + w, y + h],
      [x, y + h],
    ])
  } else if (shape === 'diamond') {
    tracePoints(ctx, diamondPoints(x, y, w, h))
  } else if (shape === 'pentagon') {
    tracePoints(ctx, regularPolygon(5, x, y, w, h))
  } else if (shape === 'hexagon') {
    tracePoints(ctx, regularPolygon(6, x, y, w, h, 0))
  } else if (shape === 'star') {
    tracePoints(ctx, starPoints(x, y, w, h))
    applyStyle(ctx, style, mode, true)
    ctx.restore()
    return
  } else if (shape === 'callout') {
    pathCallout(ctx, x, y, Math.max(w, 1), Math.max(h, 1))
  }
  applyStyle(ctx, style, mode)
  ctx.restore()
}

export function renderPolygon(ctx, points, style, closed) {
  if (points.length < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y)
  if (closed) ctx.closePath()
  const mode = closed ? style.mode : 'outline'
  applyStyle(ctx, style, mode)
  ctx.restore()
}

export function renderCurve(ctx, p0, p1, c1, c2, style) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  if (!c1) {
    ctx.lineTo(p1.x, p1.y)
  } else if (!c2) {
    ctx.quadraticCurveTo(c1.x, c1.y, p1.x, p1.y)
  } else {
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y)
  }
  applyStyle(ctx, style, 'outline')
  ctx.restore()
}
