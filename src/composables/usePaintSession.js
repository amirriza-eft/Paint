import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { paint } from '../services/paintApi.js'
import { usePaintStore } from '../stores/paintStore.js'
import { createHistory } from './useHistory.js'
import { clampZoom, nextZoom, prevZoom } from './useZoom.js'
import { installShortcuts, isTypingTarget } from './useKeyboardShortcuts.js'
import { installWheelZoom } from './useCanvas.js'
import { readClipboardImageFile, writeImageToClipboard } from './useClipboard.js'
import { capturePointer, coalescedPoints } from './useDrawing.js'
import { canvasPoint, cloneCanvas, downloadBlob, extensionFor, fileBaseName, formatFromName, isImageFile, mimeFor, safeFileName } from '../utils/canvasUtils.js'
import { blankCanvas, canvasFromImage, canvasToBlob, flipCanvas, loadImageFile, MAX_EDGE, resizeCanvas, rotateCanvas, skewCanvas } from '../utils/imageUtils.js'
import { hexToRgba, normalizeHex } from '../utils/colorUtils.js'
import { boundsFromDrag, constrainAngle, dist, polygonBBox } from '../utils/geometry.js'
import { drawPencil } from '../tools/pencil.js'
import { drawBrush, sprayAirbrush } from '../tools/brush.js'
import { eraseStroke } from '../tools/eraser.js'
import { createFloodFill } from '../tools/fill.js'
import { sampleColor } from '../tools/colorPicker.js'
import { renderCurve, renderPolygon, renderShape } from '../tools/shapes.js'
import { drawText } from '../tools/text.js'
import {
  applyPolygonMask,
  cloneSelectionBuffer,
  copyCanvasRegion,
  handleCursor,
  hitSelection,
  makeColorTransparent,
  punchBuffer,
  resizeSelection,
  selectionBitmap,
  selectionHandles,
} from '../tools/selection.js'

export function usePaintSession() {
  const store = usePaintStore()
  const baseRef = ref(null)
  const overlayRef = ref(null)
  const workspaceRef = ref(null)
  const stackRef = ref(null)
  const fileInputRef = ref(null)
  const textRef = ref(null)
  const textBox = ref(null)
  const textValue = ref('')
  const spaceDown = ref(false)
  const canvasCursor = ref('crosshair')
  const eraserStyle = ref(null)
  const ready = ref(false)

  const history = createHistory()
  let fileHandle = null
  let uncommitted = false
  let drawing = null
  let draft = null
  let polygon = null
  let polygonArmed = false
  let curve = null
  let selection = null
  let panning = null
  let hoverHandle = null
  let antsTimer = 0
  let antsOffset = 0
  let airbrushTimer = 0
  let internalClipboard = null
  let pendingAction = null
  let saveResolver = null
  let pasteFromEvent = false
  let fillToken = 0
  let removeWheel = () => {}
  let removeKeys = () => {}

  function baseCtx() {
    return baseRef.value.getContext('2d', { willReadFrequently: true })
  }

  function overlayCtx() {
    return overlayRef.value.getContext('2d')
  }

  function pointFromEvent(event) {
    return canvasPoint(baseRef.value, event.clientX, event.clientY)
  }

  function setMessage(text) {
    store.setMessage(text)
  }

  function syncMeta() {
    const typing = Boolean(textBox.value && textValue.value)
    const transient = Boolean(selection || uncommitted || typing || polygon || curve || drawing || draft)
    store.canUndo = history.canUndo || transient
    store.canRedo = history.canRedo && !transient
    store.dirty = history.dirty || uncommitted || Boolean(selection) || typing
    store.hasSelection = Boolean(selection)
  }

  function foreground(secondary) {
    return secondary ? store.secondary : store.primary
  }

  function shiftedPoint(start, end, shift) {
    if (!shift) return end
    const snapped = constrainAngle(start.x, start.y, end.x, end.y)
    return { x: snapped.x, y: snapped.y }
  }

  function styleFor(secondary, shift = false) {
    return {
      foreground: foreground(secondary),
      background: secondary ? store.primary : store.secondary,
      lineWidth: Math.max(1, store.size),
      mode: store.shapeFill,
      shift,
    }
  }

  function stopAirbrush() {
    if (airbrushTimer) window.clearInterval(airbrushTimer)
    airbrushTimer = 0
  }

  function stopAnts() {
    if (antsTimer) window.clearInterval(antsTimer)
    antsTimer = 0
  }

  function startAnts() {
    if (antsTimer) return
    antsTimer = window.setInterval(() => {
      antsOffset = (antsOffset + 1) % 16
      if (selection) redrawOverlay()
    }, 90)
  }

  function scaledPoints(sel) {
    if (!sel.points?.length) return null
    const bw = sel.buffer.width || 1
    const bh = sel.buffer.height || 1
    return sel.points.map((p) => ({
      x: sel.x + (p.x / bw) * sel.w,
      y: sel.y + (p.y / bh) * sel.h,
    }))
  }

  function traceOutline(ctx, sel) {
    const pts = scaledPoints(sel)
    ctx.beginPath()
    if (pts) {
      pts.forEach((p, index) => (index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.closePath()
      return
    }
    ctx.rect(sel.x, sel.y, sel.w, sel.h)
  }

  function redrawOverlay() {
    const ctx = overlayCtx()
    const canvas = ctx.canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (selection) {
      ctx.drawImage(selection.buffer, selection.x, selection.y, selection.w, selection.h)
      const zoom = store.zoom || 1
      ctx.save()
      ctx.lineWidth = 1 / zoom
      ctx.setLineDash([4 / zoom, 4 / zoom])
      ctx.strokeStyle = '#000'
      ctx.lineDashOffset = -antsOffset / zoom
      traceOutline(ctx, selection)
      ctx.stroke()
      ctx.strokeStyle = '#fff'
      ctx.lineDashOffset = -(antsOffset + 4) / zoom
      traceOutline(ctx, selection)
      ctx.stroke()
      ctx.setLineDash([])
      const handles = selectionHandles(selection)
      const s = 6 / zoom
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 1 / zoom
      Object.values(handles).forEach((handle) => {
        ctx.fillRect(handle.x - s / 2, handle.y - s / 2, s, s)
        ctx.strokeRect(handle.x - s / 2, handle.y - s / 2, s, s)
      })
      ctx.restore()
    }
    if (draft?.kind === 'rect') {
      const box = boundsFromDrag(draft.start.x, draft.start.y, draft.current.x, draft.current.y)
      ctx.save()
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1 / store.zoom
      ctx.setLineDash([4 / store.zoom, 3 / store.zoom])
      ctx.strokeRect(box.x, box.y, box.w, box.h)
      ctx.restore()
    }
    if (draft?.kind === 'free' && draft.points.length) {
      ctx.save()
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1 / store.zoom
      ctx.setLineDash([4 / store.zoom, 3 / store.zoom])
      ctx.beginPath()
      draft.points.forEach((p, index) => (index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
      ctx.restore()
    }
    if (drawing?.kind === 'shape') {
      renderShape(ctx, store.shape, drawing.start.x, drawing.start.y, drawing.last.x, drawing.last.y, styleFor(drawing.secondary, drawing.shift))
    }
    if (drawing?.kind === 'curve-line') {
      const end = shiftedPoint(drawing.start, drawing.last, drawing.shift)
      renderCurve(ctx, drawing.start, end, null, null, styleFor(drawing.secondary, false))
    }
    if (polygon?.points?.length) {
      const points = polygon.hover ? [...polygon.points, polygon.hover] : polygon.points
      renderPolygon(ctx, points, styleFor(polygon.secondary, false), false)
    }
    if (curve?.p0 && curve?.p1) {
      renderCurve(ctx, curve.p0, curve.p1, curve.previewC1 || curve.c1, curve.previewC2, styleFor(curve.secondary, false))
    }
  }

  function applyCanvas(source) {
    stopAnts()
    stopAirbrush()
    selection = null
    textBox.value = null
    textValue.value = ''
    polygon = null
    curve = null
    draft = null
    drawing = null
    polygonArmed = false
    uncommitted = false
    const base = baseRef.value
    const overlay = overlayRef.value
    const image = source === base ? cloneCanvas(source) : source
    base.width = image.width
    base.height = image.height
    overlay.width = image.width
    overlay.height = image.height
    baseCtx().drawImage(image, 0, 0)
    overlayCtx().clearRect(0, 0, overlay.width, overlay.height)
    store.width = image.width
    store.height = image.height
  }

  function showSnapshot(snap) {
    applyCanvas(snap)
    syncMeta()
  }

  function restoreCommitted() {
    const snap = history.current()
    if (snap) showSnapshot(snap)
    else syncMeta()
  }

  function initDocument(source, meta = {}) {
    applyCanvas(source)
    history.reset(baseRef.value)
    fileHandle = meta.handle || null
    store.fileName = meta.name || 'Untitled'
    store.fileFormat = meta.format || 'png'
    syncMeta()
  }

  function updateCursor(point, inside) {
    if (inside || drawing || draft || panning) {
      store.cursorX = Math.floor(point.x)
      store.cursorY = Math.floor(point.y)
    }
    if ((store.tool === 'select' || store.tool === 'freeSelect') && selection && !drawing) {
      const hit = hitSelection(selection, point.x, point.y, store.zoom)
      hoverHandle = hit
    } else hoverHandle = null
    if (store.tool === 'eraser' && (inside || drawing)) {
      const s = Math.max(1, store.size) * store.zoom
      eraserStyle.value = {
        width: `${s}px`,
        height: `${s}px`,
        left: `${point.x * store.zoom - s / 2}px`,
        top: `${point.y * store.zoom - s / 2}px`,
      }
    } else eraserStyle.value = null
    canvasCursor.value = currentCursor()
  }

  function currentCursor() {
    if (panning) return 'grabbing'
    if (spaceDown.value) return 'grab'
    if (hoverHandle) return handleCursor(hoverHandle)
    if (store.tool === 'text') return 'text'
    if (store.tool === 'magnifier') return 'zoom-in'
    if (store.tool === 'eraser') return 'none'
    return 'crosshair'
  }

  function commitText() {
    if (!textBox.value) return
    const box = textBox.value
    const value = textValue.value
    textBox.value = null
    textValue.value = ''
    if (!value.trim()) {
      syncMeta()
      return
    }
    drawText(baseCtx(), {
      ...box,
      value,
      foreground: store.primary,
      background: store.secondary,
      opaque: store.textOpaque,
      fontSize: store.fontSize,
      fontFamily: store.fontFamily,
      bold: store.bold,
      italic: store.italic,
      align: store.textAlign,
    })
    history.push(baseRef.value)
    syncMeta()
  }

  function cancelText() {
    textBox.value = null
    textValue.value = ''
    syncMeta()
  }

  function beginText(point) {
    if (textBox.value) commitText()
    textBox.value = {
      x: Math.round(point.x),
      y: Math.round(point.y),
      w: 220,
      h: 72,
    }
    textValue.value = ''
    store.tool = 'text'
    syncMeta()
    nextTick(() => textRef.value?.focus())
  }

  function selectionChanged(sel) {
    return sel.fromPaste
      || Math.round(sel.x) !== sel.originX
      || Math.round(sel.y) !== sel.originY
      || Math.round(sel.w) !== sel.originW
      || Math.round(sel.h) !== sel.originH
  }

  function commitSelection() {
    if (!selection) return
    const sel = selection
    stopAnts()
    selection = null
    if (!selectionChanged(sel)) {
      restoreCommitted()
      return
    }
    baseCtx().drawImage(sel.buffer, sel.x, sel.y, sel.w, sel.h)
    overlayCtx().clearRect(0, 0, overlayRef.value.width, overlayRef.value.height)
    uncommitted = false
    history.push(baseRef.value)
    syncMeta()
  }

  function deleteSelection() {
    if (!selection) return
    const pasted = selection.fromPaste
    stopAnts()
    selection = null
    uncommitted = false
    overlayCtx().clearRect(0, 0, overlayRef.value.width, overlayRef.value.height)
    if (!pasted) history.push(baseRef.value)
    syncMeta()
    setMessage(pasted ? 'Paste discarded' : 'Selection deleted')
  }

  function installSelection(buffer, x, y, fromPaste, points = null) {
    selection = {
      buffer,
      x,
      y,
      w: buffer.width,
      h: buffer.height,
      originX: x,
      originY: y,
      originW: buffer.width,
      originH: buffer.height,
      fromPaste,
      points,
    }
    uncommitted = true
    startAnts()
    redrawOverlay()
    syncMeta()
  }

  function cutSelectionFromBase(buffer, x, y, points = null) {
    punchBuffer(baseCtx(), buffer, x, y)
    installSelection(buffer, x, y, false, points)
  }

  function finalizeRectDraft() {
    const box = boundsFromDrag(draft.start.x, draft.start.y, draft.current.x, draft.current.y)
    draft = null
    const x = Math.round(box.x)
    const y = Math.round(box.y)
    const w = Math.round(box.w)
    const h = Math.round(box.h)
    if (w < 2 || h < 2) {
      redrawOverlay()
      return
    }
    const buffer = copyCanvasRegion(baseRef.value, x, y, w, h)
    if (store.transparentSelection) makeColorTransparent(buffer, store.secondary)
    cutSelectionFromBase(buffer, x, y)
  }

  function finalizeFreeDraft() {
    const points = draft.points.slice()
    draft = null
    if (points.length < 3) {
      redrawOverlay()
      return
    }
    const box = polygonBBox(points)
    const x = Math.floor(box.x)
    const y = Math.floor(box.y)
    const w = Math.ceil(box.x + box.w) - x
    const h = Math.ceil(box.y + box.h) - y
    if (w < 2 || h < 2) {
      redrawOverlay()
      return
    }
    const buffer = copyCanvasRegion(baseRef.value, x, y, w, h)
    const local = points.map((p) => ({ x: p.x - x, y: p.y - y }))
    applyPolygonMask(buffer, local.map((p) => ({ x: p.x, y: p.y })), 0, 0)
    if (store.transparentSelection) makeColorTransparent(buffer, store.secondary)
    cutSelectionFromBase(buffer, x, y, local)
  }

  function commitPolygon() {
    if (!polygon || polygon.points.length < 2) {
      polygon = null
      redrawOverlay()
      syncMeta()
      return
    }
    const points = polygon.points.slice()
    const secondary = polygon.secondary
    const closed = points.length >= 3
    polygon = null
    renderPolygon(baseCtx(), points, styleFor(secondary, false), closed)
    history.push(baseRef.value)
    redrawOverlay()
    syncMeta()
  }

  function commitCurve() {
    if (!curve?.p0 || !curve?.p1) {
      curve = null
      redrawOverlay()
      return
    }
    const current = curve
    curve = null
    renderCurve(baseCtx(), current.p0, current.p1, current.c1, current.c2, styleFor(current.secondary, false))
    history.push(baseRef.value)
    redrawOverlay()
    syncMeta()
  }

  function finishTransient() {
    if (textBox.value) commitText()
    if (polygon?.points?.length >= 2) commitPolygon()
    else polygon = null
    if (curve) commitCurve()
    if (selection) commitSelection()
    draft = null
    drawing = null
    polygonArmed = false
    stopAirbrush()
    if (overlayRef.value) redrawOverlay()
    syncMeta()
  }

  function paintStroke(from, to, size) {
    const color = foreground(drawing.secondary)
    const ctx = baseCtx()
    if (store.tool === 'eraser') eraseStroke(ctx, from, to, size)
    else if (store.tool === 'brush') drawBrush(ctx, store.brush, from, to, color, size)
    else drawPencil(ctx, from, to, color, size)
  }

  function activeSize(event) {
    if (event?.pointerType === 'pen' && event.pressure > 0) {
      return Math.max(1, store.size * (0.35 + event.pressure * 1.15))
    }
    return Math.max(1, store.size)
  }

  function finishGesture(event) {
    if (draft?.kind === 'rect') {
      finalizeRectDraft()
      return
    }
    if (draft?.kind === 'free') {
      finalizeFreeDraft()
      return
    }
    if (!drawing) return
    if (drawing.kind === 'stroke') {
      stopAirbrush()
      history.push(baseRef.value)
      uncommitted = false
      drawing = null
      syncMeta()
      return
    }
    if (drawing.kind === 'shape') {
      const gesture = drawing
      drawing = null
      if (Math.hypot(gesture.last.x - gesture.start.x, gesture.last.y - gesture.start.y) >= 1) {
        renderShape(baseCtx(), store.shape, gesture.start.x, gesture.start.y, gesture.last.x, gesture.last.y, styleFor(gesture.secondary, gesture.shift))
        history.push(baseRef.value)
      }
      redrawOverlay()
      syncMeta()
      return
    }
    if (drawing.kind === 'curve-line') {
      const gesture = drawing
      drawing = null
      const end = shiftedPoint(gesture.start, gesture.last, gesture.shift)
      if (Math.hypot(end.x - gesture.start.x, end.y - gesture.start.y) < 1) {
        redrawOverlay()
        return
      }
      curve = {
        p0: gesture.start,
        p1: end,
        c1: null,
        c2: null,
        phase: 'c1',
        secondary: gesture.secondary,
      }
      setMessage('Drag to bend the curve. Drag again for a second bend, or press Enter.')
      redrawOverlay()
      syncMeta()
      return
    }
    if (drawing.kind === 'curve-c1') {
      curve.c1 = curve.previewC1 || pointFromEvent(event)
      curve.previewC1 = null
      curve.phase = 'c2'
      drawing = null
      setMessage('Drag to bend the curve a second time, or press Enter.')
      redrawOverlay()
      return
    }
    if (drawing.kind === 'curve-c2') {
      curve.c2 = curve.previewC2 || pointFromEvent(event)
      curve.previewC2 = null
      drawing = null
      commitCurve()
      setMessage('')
      return
    }
    if (drawing.kind === 'selection' || drawing.kind === 'text-resize') {
      drawing = null
      redrawOverlay()
      syncMeta()
    }
  }

  function doFill(point, secondary) {
    const token = ++fillToken
    const ctx = baseCtx()
    const image = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    const color = hexToRgba(foreground(secondary))
    const job = createFloodFill(image, point.x, point.y, color, 18)
    const finish = () => {
      if (token !== fillToken) return
      store.busy = false
      if (!job.painted) return
      ctx.putImageData(image, 0, 0)
      history.push(baseRef.value)
      syncMeta()
    }
    job.step(900000)
    if (job.done) {
      finish()
      return
    }
    store.busy = true
    const pump = () => {
      if (token !== fillToken) {
        store.busy = false
        restoreCommitted()
        return
      }
      job.step(250000)
      ctx.putImageData(image, 0, 0)
      if (!job.done) requestAnimationFrame(pump)
      else finish()
    }
    requestAnimationFrame(pump)
  }

  function addPolygonPoint(event) {
    polygonArmed = false
    let point = pointFromEvent(event)
    const secondary = event.button === 2
    if (!polygon) {
      polygon = { points: [point], secondary, hover: null, lastTime: performance.now() }
      setMessage('Click to add points. Click the start point or press Enter to finish.')
      redrawOverlay()
      syncMeta()
      return
    }
    const last = polygon.points[polygon.points.length - 1]
    const first = polygon.points[0]
    if (event.shiftKey) {
      const snapped = constrainAngle(last.x, last.y, point.x, point.y)
      point = { x: snapped.x, y: snapped.y }
    }
    const now = performance.now()
    const closeToStart = polygon.points.length >= 3 && dist(point, first) <= 8 / store.zoom
    const doubleClick = polygon.points.length >= 3 && dist(point, last) <= 5 / store.zoom && now - polygon.lastTime < 450
    if (closeToStart || doubleClick) {
      commitPolygon()
      setMessage('')
      return
    }
    polygon.points.push(point)
    polygon.lastTime = now
    redrawOverlay()
  }

  function onPointerDown(event) {
    if (store.busy || store.dialog) return
    if (event.target.closest?.('.text-editor')) return
    if (event.target.closest?.('.text-handle')) {
      if (!textBox.value) return
      drawing = {
        kind: 'text-resize',
        start: pointFromEvent(event),
        origin: { ...textBox.value },
      }
      capturePointer(event)
      return
    }
    if (spaceDown.value || event.button === 1) {
      const ws = workspaceRef.value
      panning = {
        x: event.clientX,
        y: event.clientY,
        sl: ws.scrollLeft,
        st: ws.scrollTop,
      }
      canvasCursor.value = 'grabbing'
      capturePointer(event)
      event.preventDefault()
      return
    }
    if (event.button !== 0 && event.button !== 2) return
    const point = pointFromEvent(event)
    const secondary = event.button === 2
    updateCursor(point, true)
    if (store.tool === 'magnifier') {
      setZoom(store.zoom * (secondary ? 1 / 1.25 : 1.25), event)
      return
    }
    if (store.tool === 'picker') {
      const hex = sampleColor(baseCtx(), point.x, point.y)
      if (!hex) setMessage('Transparent pixel')
      else if (secondary) store.secondary = hex
      else store.primary = hex
      return
    }
    if (store.tool === 'fill') {
      doFill(point, secondary)
      return
    }
    if (store.tool === 'text') {
      beginText(point)
      return
    }
    if (store.tool === 'select' || store.tool === 'freeSelect') {
      if (selection) {
        const hit = hitSelection(selection, point.x, point.y, store.zoom)
        if (hit) {
          drawing = {
            kind: 'selection',
            mode: hit,
            start: point,
            origin: { x: selection.x, y: selection.y, w: selection.w, h: selection.h },
          }
          capturePointer(event)
          return
        }
        commitSelection()
      }
      draft = store.tool === 'freeSelect'
        ? { kind: 'free', points: [point] }
        : { kind: 'rect', start: point, current: point }
      capturePointer(event)
      redrawOverlay()
      return
    }
    if (store.tool === 'shape' && store.shape === 'polygon') {
      polygonArmed = true
      capturePointer(event)
      return
    }
    if (store.tool === 'shape' && store.shape === 'curve' && curve) {
      drawing = { kind: curve.phase === 'c2' ? 'curve-c2' : 'curve-c1', secondary: curve.secondary }
      capturePointer(event)
      return
    }
    if (store.tool === 'shape' && store.shape === 'curve') {
      drawing = { kind: 'curve-line', start: point, last: point, secondary, shift: event.shiftKey }
      capturePointer(event)
      redrawOverlay()
      return
    }
    if (store.tool === 'shape') {
      drawing = { kind: 'shape', start: point, last: point, secondary, shift: event.shiftKey }
      capturePointer(event)
      redrawOverlay()
      return
    }
    drawing = { kind: 'stroke', start: point, last: point, secondary }
    uncommitted = true
    paintStroke(point, point, activeSize(event))
    if (store.tool === 'brush' && store.brush === 'airbrush') {
      stopAirbrush()
      airbrushTimer = window.setInterval(() => {
        if (!drawing || drawing.kind !== 'stroke') return
        sprayAirbrush(baseCtx(), drawing.last.x, drawing.last.y, foreground(drawing.secondary), activeSize(event))
      }, 40)
    }
    capturePointer(event)
    syncMeta()
  }

  function onPointerMove(event) {
    if (panning) {
      workspaceRef.value.scrollLeft = panning.sl - (event.clientX - panning.x)
      workspaceRef.value.scrollTop = panning.st - (event.clientY - panning.y)
      return
    }
    const point = pointFromEvent(event)
    const inside = point.x >= 0 && point.y >= 0 && point.x < store.width && point.y < store.height
    updateCursor(point, inside)
    if (polygon && !drawing && !polygonArmed) {
      const last = polygon.points[polygon.points.length - 1]
      if (event.shiftKey && last) {
        const snapped = constrainAngle(last.x, last.y, point.x, point.y)
        polygon.hover = { x: snapped.x, y: snapped.y }
      } else polygon.hover = point
      redrawOverlay()
    }
    if (draft?.kind === 'rect') {
      draft.current = point
      redrawOverlay()
      return
    }
    if (draft?.kind === 'free') {
      const last = draft.points[draft.points.length - 1]
      if (!last || dist(last, point) >= 1.5) draft.points.push(point)
      redrawOverlay()
      return
    }
    if (!drawing) return
    if (drawing.kind === 'stroke') {
      const samples = coalescedPoints(event, (x, y) => canvasPoint(baseRef.value, x, y))
      let previous = drawing.last
      const size = activeSize(event)
      for (const sample of samples) {
        paintStroke(previous, sample, size)
        previous = sample
      }
      drawing.last = previous
      return
    }
    if (drawing.kind === 'shape' || drawing.kind === 'curve-line') {
      drawing.shift = event.shiftKey
      drawing.last = point
      redrawOverlay()
      return
    }
    if (drawing.kind === 'curve-c1' && curve) {
      curve.previewC1 = point
      redrawOverlay()
      return
    }
    if (drawing.kind === 'curve-c2' && curve) {
      curve.previewC2 = point
      redrawOverlay()
      return
    }
    if (drawing.kind === 'selection' && selection) {
      const dx = point.x - drawing.start.x
      const dy = point.y - drawing.start.y
      if (drawing.mode === 'move') {
        selection.x = drawing.origin.x + dx
        selection.y = drawing.origin.y + dy
      } else {
        Object.assign(selection, resizeSelection(drawing.origin, drawing.mode, dx, dy))
      }
      redrawOverlay()
      return
    }
    if (drawing.kind === 'text-resize' && textBox.value) {
      textBox.value = {
        ...textBox.value,
        w: Math.max(32, drawing.origin.w + point.x - drawing.start.x),
        h: Math.max(24, drawing.origin.h + point.y - drawing.start.y),
      }
    }
  }

  function onPointerUp(event) {
    if (panning) {
      panning = null
      canvasCursor.value = currentCursor()
      return
    }
    if (polygonArmed) {
      addPolygonPoint(event)
      return
    }
    if (drawing || draft) finishGesture(event)
  }

  function onPointerLeave() {
    if (drawing || draft || panning) return
    store.cursorX = null
    store.cursorY = null
    eraserStyle.value = null
    hoverHandle = null
    canvasCursor.value = currentCursor()
  }

  function onContextMenu(event) {
    event.preventDefault()
  }

  function setZoom(value, anchor) {
    const zoom = clampZoom(value)
    const ws = workspaceRef.value
    const canvas = baseRef.value
    if (!ws || !canvas) {
      store.zoom = zoom
      return
    }
    const rect = canvas.getBoundingClientRect()
    const wsRect = ws.getBoundingClientRect()
    const ax = anchor?.clientX ?? wsRect.left + ws.clientWidth / 2
    const ay = anchor?.clientY ?? wsRect.top + ws.clientHeight / 2
    const rx = rect.width ? (ax - rect.left) / rect.width : 0.5
    const ry = rect.height ? (ay - rect.top) / rect.height : 0.5
    store.zoom = zoom
    nextTick(() => {
      const next = canvas.getBoundingClientRect()
      ws.scrollLeft += next.left + rx * next.width - ax
      ws.scrollTop += next.top + ry * next.height - ay
      redrawOverlay()
    })
  }

  function zoomIn() {
    setZoom(nextZoom(store.zoom))
  }

  function zoomOut() {
    setZoom(prevZoom(store.zoom))
  }

  function setTool(tool, extra = {}) {
    if (store.busy) return
    finishTransient()
    store.tool = tool
    if (extra.shape) store.shape = extra.shape
    if (extra.brush) {
      store.brush = extra.brush
      store.tool = 'brush'
    }
    store.menu = null
    hoverHandle = null
    canvasCursor.value = currentCursor()
    if (tool === 'shape' && extra.shape === 'polygon') {
      setMessage('Click to add polygon points. Press Enter to finish.')
    }
  }

  function selectAll() {
    finishTransient()
    const base = baseRef.value
    const buffer = cloneCanvas(base)
    baseCtx().clearRect(0, 0, base.width, base.height)
    store.tool = 'select'
    installSelection(buffer, 0, 0, false)
  }

  function copy() {
    const source = selection ? selectionBitmap(selection) : baseRef.value
    internalClipboard = cloneCanvas(source)
    writeImageToClipboard(source)
      .then(() => setMessage('Copied'))
      .catch(() => setMessage('Copied inside Paint'))
  }

  function cut() {
    if (!selection) selectAll()
    if (!selection) return
    internalClipboard = cloneSelectionBuffer(selection)
    const pasted = selection.fromPaste
    writeImageToClipboard(internalClipboard).catch(() => {})
    if (pasted) {
      deleteSelection()
    } else {
      stopAnts()
      selection = null
      uncommitted = false
      overlayCtx().clearRect(0, 0, overlayRef.value.width, overlayRef.value.height)
      history.push(baseRef.value)
      syncMeta()
    }
    setMessage('Cut')
  }

  function pasteCanvas(source) {
    finishTransient()
    const buffer = cloneCanvas(source)
    const x = buffer.width >= baseRef.value.width ? 0 : 16
    const y = buffer.height >= baseRef.value.height ? 0 : 16
    store.tool = 'select'
    installSelection(buffer, x, y, true)
    setMessage('Pasted')
  }

  async function pasteImageFile(file) {
    try {
      const image = await loadImageFile(file)
      pasteCanvas(canvasFromImage(image))
    } catch {
      setMessage('Could not paste that image')
    }
  }

  async function pasteInternal() {
    if (internalClipboard) {
      pasteCanvas(internalClipboard)
      return
    }
    try {
      const file = await readClipboardImageFile()
      if (file) await pasteImageFile(file)
      else setMessage('Clipboard is empty')
    } catch {
      setMessage('Clipboard is empty')
    }
  }

  function schedulePaste() {
    pasteFromEvent = false
    window.setTimeout(() => {
      if (!pasteFromEvent) pasteInternal()
    }, 40)
  }

  function onPaste(event) {
    if (isTypingTarget(event.target)) return
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    if (!file) return
    event.preventDefault()
    pasteFromEvent = true
    pasteImageFile(file)
  }

  function crop() {
    if (!selection) {
      setMessage('Select an area to crop')
      return
    }
    const cropped = selectionBitmap(selection)
    stopAnts()
    selection = null
    uncommitted = false
    applyCanvas(cropped)
    history.push(baseRef.value)
    syncMeta()
    setMessage('Cropped')
  }

  function rotate(degrees) {
    finishTransient()
    applyCanvas(rotateCanvas(baseRef.value, degrees))
    history.push(baseRef.value)
    syncMeta()
    store.menu = null
  }

  function flip(direction) {
    finishTransient()
    applyCanvas(flipCanvas(baseRef.value, direction === 'horizontal', direction === 'vertical'))
    history.push(baseRef.value)
    syncMeta()
    store.menu = null
  }

  function applyResize({ width, height, skewH = 0, skewV = 0 }) {
    const w = Math.round(Number(width))
    const h = Math.round(Number(height))
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1 || w > MAX_EDGE || h > MAX_EDGE) {
      setMessage(`Size must be between 1 and ${MAX_EDGE} pixels`)
      return false
    }
    try {
      finishTransient()
      let next = resizeCanvas(baseRef.value, w, h)
      if (skewH || skewV) next = skewCanvas(next, Number(skewH) || 0, Number(skewV) || 0)
      applyCanvas(next)
      history.push(baseRef.value)
      syncMeta()
      store.dialog = null
      return true
    } catch (error) {
      setMessage(error.message || 'Could not resize the image')
      return false
    }
  }

  async function openFileObject(file, handle = null) {
    if (!isImageFile(file)) {
      setMessage('Choose a PNG, JPEG, WEBP, or BMP image')
      return
    }
    try {
      const image = await loadImageFile(file)
      if (image.width > MAX_EDGE || image.height > MAX_EDGE) {
        setMessage(`Images must be ${MAX_EDGE} pixels or smaller`)
        return
      }
      initDocument(canvasFromImage(image), {
        name: fileBaseName(file.name),
        format: formatFromName(file.name),
        handle,
      })
      setMessage('Opened')
    } catch (error) {
      setMessage(error.message || 'Could not open that image')
    }
  }

  async function pickAndOpen() {
    if (typeof window.showOpenFilePicker !== 'function') {
      fileInputRef.value?.click()
      return
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'Images',
          accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
            'image/bmp': ['.bmp'],
          },
        }],
      })
      const file = await handle.getFile()
      await openFileObject(file, handle)
    } catch (error) {
      if (error?.name !== 'AbortError') fileInputRef.value?.click()
    }
  }

  function guard(action) {
    store.menu = null
    syncMeta()
    if (!store.dirty) {
      action()
      return
    }
    pendingAction = action
    store.dialog = 'unsaved'
  }

  function createNew(width, height) {
    const w = Math.round(Number(width))
    const h = Math.round(Number(height))
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1 || w > MAX_EDGE || h > MAX_EDGE) {
      setMessage(`Size must be between 1 and ${MAX_EDGE} pixels`)
      return
    }
    initDocument(blankCanvas(w, h))
    store.dialog = null
    setMessage('New image')
  }

  function newImage() {
    guard(() => {
      store.dialog = 'new'
    })
  }

  function open() {
    guard(() => pickAndOpen())
  }

  async function writeToHandle(handle, format, quality) {
    const blob = await canvasToBlob(baseRef.value, format, quality)
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
  }

  async function save() {
    store.menu = null
    finishTransient()
    if (!fileHandle) return saveAs()
    try {
      await writeToHandle(fileHandle, store.fileFormat, 0.92)
      history.markSaved()
      syncMeta()
      setMessage('Saved')
      return true
    } catch {
      return saveAs()
    }
  }

  function saveAs() {
    store.menu = null
    store.dialog = 'save'
    return new Promise((resolve) => {
      saveResolver = resolve
    })
  }

  async function confirmSave({ name, format, quality }) {
    const clean = safeFileName(name)
    store.fileName = clean
    store.fileFormat = format
    store.dialog = null
    const filename = `${clean}.${extensionFor(format)}`
    let saved = false
    try {
      if (typeof window.showSaveFilePicker === 'function') {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: format.toUpperCase(),
            accept: { [mimeFor(format)]: [`.${extensionFor(format)}`] },
          }],
        })
        fileHandle = handle
        await writeToHandle(handle, format, quality)
        saved = true
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        saveResolver?.(false)
        saveResolver = null
        return false
      }
    }
    if (!saved) {
      const blob = await canvasToBlob(baseRef.value, format, quality)
      downloadBlob(blob, filename)
      fileHandle = null
    }
    history.markSaved()
    syncMeta()
    setMessage('Saved')
    saveResolver?.(true)
    saveResolver = null
    return true
  }

  function printImage() {
    finishTransient()
    const url = baseRef.value.toDataURL('image/png')
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) {
      setMessage('Allow pop-ups to print')
      return
    }
    win.document.open()
    win.document.write('<!DOCTYPE html><html><head><title>Print</title><style>html,body{margin:0;background:#fff}img{max-width:100%}</style></head><body></body></html>')
    win.document.close()
    const image = win.document.createElement('img')
    image.alt = store.fileName
    image.onload = () => {
      win.focus()
      win.print()
    }
    image.src = url
    win.document.body.appendChild(image)
    store.menu = null
  }

  function exit() {
    guard(() => {
      store.windowState = 'closed'
      store.dialog = null
      store.menu = null
    })
  }

  function cancelInProgress() {
    fillToken += 1
    store.busy = false
    if (textBox.value) {
      cancelText()
      return
    }
    if (draft || drawing || polygon || curve || selection || uncommitted) {
      restoreCommitted()
      setMessage('')
    }
  }

  function undo() {
    if (store.menu) {
      store.menu = null
      return
    }
    if (textBox.value) {
      cancelText()
      return
    }
    if (draft || drawing || polygon || curve || selection || uncommitted) {
      cancelInProgress()
      return
    }
    const snap = history.undo()
    if (!snap) return
    showSnapshot(snap)
  }

  function redo() {
    if (draft || drawing || polygon || curve || selection || uncommitted || textBox.value) return
    const snap = history.redo()
    if (!snap) return
    showSnapshot(snap)
  }

  function cancelDialog() {
    if (store.dialog === 'unsaved') pendingAction = null
    if (store.dialog === 'save') {
      saveResolver?.(false)
      saveResolver = null
    }
    store.dialog = null
  }

  function discardChanges() {
    const action = pendingAction
    pendingAction = null
    store.dialog = null
    action?.()
  }

  async function saveAndContinue() {
    const action = pendingAction
    pendingAction = null
    store.dialog = null
    const ok = await save()
    if (ok) action?.()
  }

  function editColors(target) {
    store.menu = null
    store.colorTarget = target === 'secondary' ? 'secondary' : 'primary'
    store.dialog = 'colors'
  }

  function applyEditedColor(hex) {
    const next = normalizeHex(hex)
    if (!next) return
    if (store.colorTarget === 'secondary') store.secondary = next
    else store.primary = next
    store.dialog = null
  }

  function addCustomColor(hex) {
    const next = normalizeHex(hex)
    if (!next) return
    store.customColors = [next, ...store.customColors.slice(0, 9)]
  }

  async function estimateBytes() {
    const blob = await canvasToBlob(baseRef.value, 'png')
    return blob.size
  }

  function onKeyDown(event) {
    if (store.windowState === 'closed') return
    const typing = isTypingTarget(event.target)
    if (event.key === 'Escape') {
      event.preventDefault()
      if (store.menu) {
        store.menu = null
        return
      }
      if (store.dialog) {
        cancelDialog()
        return
      }
      cancelInProgress()
      return
    }
    if (store.dialog) return
    if (event.key === ' ' && !typing) {
      spaceDown.value = true
      canvasCursor.value = currentCursor()
      event.preventDefault()
      return
    }
    if (typing && event.target?.classList?.contains('text-editor')) {
      const ctrl = event.ctrlKey || event.metaKey
      if (ctrl && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        store.bold = !store.bold
      } else if (ctrl && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        store.italic = !store.italic
      } else if (ctrl && event.key === 'Enter') {
        event.preventDefault()
        commitText()
      }
      return
    }
    if (typing) return
    if (event.key === 'Delete' && selection) {
      event.preventDefault()
      deleteSelection()
      return
    }
    if (selection && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      const step = event.shiftKey ? 10 : 1
      if (event.key === 'ArrowLeft') selection.x -= step
      if (event.key === 'ArrowRight') selection.x += step
      if (event.key === 'ArrowUp') selection.y -= step
      if (event.key === 'ArrowDown') selection.y += step
      redrawOverlay()
      return
    }
    const ctrl = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (!ctrl && event.key === 'Enter' && polygon) {
      event.preventDefault()
      commitPolygon()
      setMessage('')
      return
    }
    if (!ctrl && event.key === 'Enter' && curve) {
      event.preventDefault()
      commitCurve()
      setMessage('')
      return
    }
    if (!ctrl) return
    if (key === 'n') {
      event.preventDefault()
      newImage()
    } else if (key === 'o') {
      event.preventDefault()
      open()
    } else if (key === 's' && event.shiftKey) {
      event.preventDefault()
      saveAs()
    } else if (key === 's') {
      event.preventDefault()
      save()
    } else if (key === 'p') {
      event.preventDefault()
      printImage()
    } else if (key === 'z' && event.shiftKey) {
      event.preventDefault()
      redo()
    } else if (key === 'z') {
      event.preventDefault()
      undo()
    } else if (key === 'y') {
      event.preventDefault()
      redo()
    } else if (key === 'a') {
      event.preventDefault()
      selectAll()
    } else if (key === 'c') {
      event.preventDefault()
      copy()
    } else if (key === 'x') {
      event.preventDefault()
      cut()
    } else if (key === 'v') {
      schedulePaste()
    } else if (event.key === '+' || event.key === '=' || event.key === 'Add') {
      event.preventDefault()
      zoomIn()
    } else if (event.key === '-' || event.key === '_' || event.key === 'Subtract') {
      event.preventDefault()
      zoomOut()
    }
  }

  function onKeyUp(event) {
    if (event.key === ' ') {
      spaceDown.value = false
      canvasCursor.value = currentCursor()
    }
  }

  function onFileInput(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) openFileObject(file)
  }

  function onDragOver(event) {
    const items = [...(event.dataTransfer?.items || [])]
    if (!items.some((item) => item.kind === 'file')) return
    event.preventDefault()
    store.dragOver = true
  }

  function onDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    store.dragOver = false
  }

  function onDrop(event) {
    event.preventDefault()
    store.dragOver = false
    const file = [...(event.dataTransfer?.files || [])].find(isImageFile)
    if (!file) {
      setMessage('Drop a PNG, JPEG, WEBP, or BMP image')
      return
    }
    guard(() => openFileObject(file))
  }

  function toggleMenu(name) {
    store.menu = store.menu === name ? null : name
  }

  Object.assign(paint, {
    newImage,
    createNew,
    open,
    save,
    saveAs,
    confirmSave,
    printImage,
    exit,
    undo,
    redo,
    cut,
    copy,
    paste: schedulePaste,
    selectAll,
    deleteSelection,
    crop,
    openResize() { store.menu = null; store.dialog = 'resize' },
    applyResize,
    rotate,
    flip,
    zoomIn,
    zoomOut,
    setZoom,
    editColors,
    applyEditedColor,
    addCustomColor,
    minimize() { store.windowState = 'minimized' },
    toggleMaximize() {
      store.windowState = store.windowState === 'maximized' ? 'normal' : 'maximized'
    },
    close: exit,
    cancelDialog,
    discardChanges,
    saveAndContinue,
    setTool,
    openProperties() { store.menu = null; store.dialog = 'properties' },
    estimateBytes,
    toggleMenu,
  })

  onMounted(() => {
    initDocument(blankCanvas(store.width, store.height))
    removeKeys = installShortcuts(onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('paste', onPaste)
    removeWheel = installWheelZoom(workspaceRef.value, (event) => {
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
      setZoom(store.zoom * factor, event)
    })
    ready.value = true
    canvasCursor.value = currentCursor()
  })

  onBeforeUnmount(() => {
    stopAnts()
    stopAirbrush()
    removeKeys()
    removeWheel()
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('paste', onPaste)
  })

  return {
    baseRef,
    overlayRef,
    workspaceRef,
    stackRef,
    fileInputRef,
    textRef,
    textBox,
    textValue,
    canvasCursor,
    eraserStyle,
    ready,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
    onFileInput,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
