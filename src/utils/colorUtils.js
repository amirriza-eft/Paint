export const PALETTE = [
  '#000000', '#7F7F7F', '#880015', '#ED1C24', '#FF7F27',
  '#FFF200', '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
  '#FFFFFF', '#C3C3C3', '#B97A57', '#FFAEC9', '#FFC90E',
  '#EFE4B0', '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7',
]

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function rgbToHex(r, g, b) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

export function parseHex(input) {
  if (!input) return null
  let hex = String(input).trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex.split('').map((c) => c + c).join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

export function normalizeHex(input) {
  const rgb = parseHex(input)
  if (!rgb) return null
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export function hexToRgba(hex, alpha = 255) {
  const rgb = parseHex(hex) || { r: 0, g: 0, b: 0 }
  return [rgb.r, rgb.g, rgb.b, alpha]
}

export function rgbToHsv(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return {
    h,
    s: max === 0 ? 0 : d / max,
    v: max,
  }
}

export function hsvToRgb(h, s, v) {
  const hue = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) {
    r = c
    g = x
  } else if (hue < 120) {
    r = x
    g = c
  } else if (hue < 180) {
    g = c
    b = x
  } else if (hue < 240) {
    g = x
    b = c
  } else if (hue < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

export function compositeOnWhite(r, g, b, a) {
  const t = a / 255
  return [
    Math.round(r * t + 255 * (1 - t)),
    Math.round(g * t + 255 * (1 - t)),
    Math.round(b * t + 255 * (1 - t)),
  ]
}
