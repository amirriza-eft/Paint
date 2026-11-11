import { cloneCanvas, mimeFor } from './canvasUtils.js'

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read that image.'))
    image.src = src
  })
}

export async function loadImageFile(file) {
  const url = URL.createObjectURL(file)
  try {
    return await loadImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function canvasFromImage(image) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, image.width)
  canvas.height = Math.max(1, image.height)
  canvas.getContext('2d').drawImage(image, 0, 0)
  return canvas
}

export function blankCanvas(width, height, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return canvas
}

export function resizeCanvas(source, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function rotateCanvas(source, degrees) {
  const rad = (degrees * Math.PI) / 180
  const w = source.width
  const h = source.height
  const crisp = degrees % 90 === 0
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * cos + h * sin))
  canvas.height = Math.max(1, Math.round(w * sin + h * cos))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = !crisp
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(source, -w / 2, -h / 2)
  return canvas
}

export function flipCanvas(source, horizontal, vertical) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d')
  ctx.translate(horizontal ? canvas.width : 0, vertical ? canvas.height : 0)
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1)
  ctx.drawImage(source, 0, 0)
  return canvas
}

export function skewCanvas(source, horizontalDeg, verticalDeg) {
  const tx = Math.tan((horizontalDeg * Math.PI) / 180)
  const ty = Math.tan((verticalDeg * Math.PI) / 180)
  const w = source.width
  const h = source.height
  const corners = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ].map(([x, y]) => [x + y * tx, y + x * ty])
  const minX = Math.min(...corners.map((c) => c[0]))
  const maxX = Math.max(...corners.map((c) => c[0]))
  const minY = Math.min(...corners.map((c) => c[1]))
  const maxY = Math.max(...corners.map((c) => c[1]))
  const width = Math.max(1, Math.ceil(maxX - minX))
  const height = Math.max(1, Math.ceil(maxY - minY))
  if (width > 8192 || height > 8192) {
    throw new Error('Skew would make the image larger than 8192 pixels.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.transform(1, ty, tx, 1, -minX, -minY)
  ctx.drawImage(source, 0, 0)
  return canvas
}

function flattenOnWhite(source) {
  const canvas = cloneCanvas(source)
  const ctx = canvas.getContext('2d')
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

export function encodeBMP(imageData) {
  const { width, height, data } = imageData
  const rowSize = width * 4
  const imageSize = rowSize * height
  const headerSize = 40
  const offset = 14 + headerSize
  const fileSize = offset + imageSize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  bytes[0] = 0x42
  bytes[1] = 0x4d
  view.setUint32(2, fileSize, true)
  view.setUint32(10, offset, true)
  view.setUint32(14, headerSize, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 32, true)
  view.setUint32(30, 0, true)
  view.setUint32(34, imageSize, true)

  let dest = offset
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      bytes[dest] = data[i + 2]
      bytes[dest + 1] = data[i + 1]
      bytes[dest + 2] = data[i]
      bytes[dest + 3] = data[i + 3]
      dest += 4
    }
  }
  return new Blob([buffer], { type: 'image/bmp' })
}

export function canvasToBlob(canvas, format, quality = 0.92) {
  const mime = mimeFor(format)
  if (mime === 'image/bmp') {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    return Promise.resolve(encodeBMP(ctx.getImageData(0, 0, canvas.width, canvas.height)))
  }
  const source = mime === 'image/jpeg' ? flattenOnWhite(canvas) : canvas
  return new Promise((resolve, reject) => {
    source.toBlob((blob) => {
      if (!blob) reject(new Error('Could not export the image.'))
      else resolve(blob)
    }, mime, quality)
  })
}

export const MAX_EDGE = 8192
