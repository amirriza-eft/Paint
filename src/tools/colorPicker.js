import { compositeOnWhite, rgbToHex } from '../utils/colorUtils.js'

export function sampleColor(ctx, x, y) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const canvas = ctx.canvas
  if (ix < 0 || iy < 0 || ix >= canvas.width || iy >= canvas.height) return null
  const pixel = ctx.getImageData(ix, iy, 1, 1).data
  if (pixel[3] === 0) return null
  if (pixel[3] === 255) return rgbToHex(pixel[0], pixel[1], pixel[2])
  const [r, g, b] = compositeOnWhite(pixel[0], pixel[1], pixel[2], pixel[3])
  return rgbToHex(r, g, b)
}
