import assert from 'node:assert/strict'
import test from 'node:test'
import { hsvToRgb, normalizeHex, parseHex, rgbToHex, rgbToHsv } from '../src/utils/colorUtils.js'
import { arrowPoints, constrainAngle, regularPolygon, starPoints } from '../src/utils/geometry.js'
import { encodeBMP } from '../src/utils/imageUtils.js'
import { floodFill } from '../src/tools/fill.js'
import { resizeSelection } from '../src/tools/selection.js'
import { shapeEndpoints } from '../src/tools/shapes.js'
import { wrapTextLines } from '../src/tools/text.js'

function image(width, height, fill) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
  }
  return { width, height, data }
}

function pixel(img, x, y) {
  const i = (y * img.width + x) * 4
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]
}

test('hex and hsv conversions round-trip', () => {
  assert.deepEqual(parseHex('#fff'), { r: 255, g: 255, b: 255 })
  assert.equal(normalizeHex('336699'), '#336699')
  assert.equal(rgbToHex(237, 28, 36), '#ED1C24')
  const red = hsvToRgb(0, 1, 1)
  assert.deepEqual(red, { r: 255, g: 0, b: 0 })
  const hsv = rgbToHsv(0, 255, 0)
  assert.ok(Math.abs(hsv.h - 120) < 0.01)
  assert.equal(hsv.s, 1)
  assert.equal(hsv.v, 1)
})

test('angle constraint snaps to 45 degrees', () => {
  const end = constrainAngle(0, 0, 10, 3)
  assert.equal(end.y, 0)
  const diagonal = constrainAngle(0, 0, 10, 9)
  assert.ok(Math.abs(diagonal.x - diagonal.y) < 0.001)
})

test('shape geometry', () => {
  assert.equal(starPoints(0, 0, 100, 100).length, 10)
  assert.equal(regularPolygon(6, 0, 0, 40, 40).length, 6)
  assert.equal(arrowPoints(0, 0, 40, 0).length, 7)
  const square = shapeEndpoints('rect', 0, 0, 10, 30, true)
  assert.equal(square.box.w, square.box.h)
  const line = shapeEndpoints('line', 0, 0, 10, 1, true)
  assert.equal(line.y1, 0)
})

test('flood fill stays inside a boundary', () => {
  const img = image(5, 5, [255, 255, 255, 255])
  for (let y = 0; y < 5; y += 1) {
    const i = (y * 5 + 2) * 4
    img.data[i] = 255
    img.data[i + 1] = 0
    img.data[i + 2] = 0
    img.data[i + 3] = 255
  }
  assert.equal(floodFill(img, 0, 0, [0, 0, 255, 255], 0), true)
  assert.deepEqual(pixel(img, 1, 2), [0, 0, 255, 255])
  assert.deepEqual(pixel(img, 2, 2), [255, 0, 0, 255])
  assert.deepEqual(pixel(img, 3, 2), [255, 255, 255, 255])
  assert.equal(floodFill(img, 1, 1, [0, 0, 255, 255], 0), false)
})

test('flood fill covers a solid region and keeps an enclosed center', () => {
  const img = image(5, 5, [255, 255, 255, 255])
  const block = (x, y) => {
    const i = (y * 5 + x) * 4
    img.data[i] = 0
    img.data[i + 1] = 0
    img.data[i + 2] = 0
    img.data[i + 3] = 255
  }
  ;[[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]].forEach(([x, y]) => block(x, y))
  floodFill(img, 0, 0, [0, 128, 0, 255], 0)
  assert.deepEqual(pixel(img, 0, 4), [0, 128, 0, 255])
  assert.deepEqual(pixel(img, 2, 2), [255, 255, 255, 255])
  assert.deepEqual(pixel(img, 2, 1), [0, 0, 0, 255])
})

test('bmp encoder writes a 32-bit bottom-up file', () => {
  const img = image(2, 1, [255, 0, 0, 128])
  const blob = encodeBMP(img)
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer)
    const view = new DataView(buffer)
    assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'BM')
    assert.equal(view.getInt32(18, true), 2)
    assert.equal(view.getInt32(22, true), 1)
    assert.equal(view.getUint16(28, true), 32)
    const offset = view.getUint32(10, true)
    assert.equal(bytes[offset], 0)
    assert.equal(bytes[offset + 1], 0)
    assert.equal(bytes[offset + 2], 255)
    assert.equal(bytes[offset + 3], 128)
  })
})

test('selection resize keeps a minimum of one pixel', () => {
  const next = resizeSelection({ x: 10, y: 10, w: 40, h: 20 }, 'nw', 80, 80)
  assert.ok(next.w >= 1)
  assert.ok(next.h >= 1)
  const east = resizeSelection({ x: 10, y: 10, w: 40, h: 20 }, 'e', 15, 0)
  assert.equal(east.w, 55)
  assert.equal(east.x, 10)
})

test('text wrapping breaks long lines', () => {
  const lines = wrapTextLines((value) => value.length * 10, 'hello world', 60)
  assert.deepEqual(lines, ['hello', 'world'])
  const explicit = wrapTextLines((value) => value.length * 10, 'a\nb', 100)
  assert.deepEqual(explicit, ['a', 'b'])
})
