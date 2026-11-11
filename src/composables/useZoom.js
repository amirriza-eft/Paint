export const ZOOM_MIN = 0.125
export const ZOOM_MAX = 8
export const ZOOM_STEPS = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8]

export function clampZoom(value) {
  const zoom = Number(value)
  if (!Number.isFinite(zoom)) return 1
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

export function nextZoom(zoom) {
  return ZOOM_STEPS.find((step) => step > zoom + 0.001) || ZOOM_MAX
}

export function prevZoom(zoom) {
  const smaller = ZOOM_STEPS.filter((step) => step < zoom - 0.001)
  return smaller.length ? smaller[smaller.length - 1] : ZOOM_MIN
}
