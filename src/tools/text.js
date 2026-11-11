export const FONTS = [
  'Segoe UI',
  'Arial',
  'Calibri',
  'Verdana',
  'Tahoma',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Comic Sans MS',
  'Impact',
]

export function fontString({ italic, bold, fontSize, fontFamily }) {
  return `${italic ? 'italic ' : ''}${bold ? '700 ' : '400 '}${fontSize}px "${fontFamily}", sans-serif`
}

export function wrapTextLines(measure, text, maxWidth) {
  const paragraphs = String(text).replace(/\r/g, '').split('\n')
  const lines = []
  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(/(\s+)/)
    let line = ''
    for (const word of words) {
      const next = line + word
      if (line && measure(next) > maxWidth) {
        lines.push(line.replace(/\s+$/, ''))
        line = word.trimStart()
        if (measure(line) > maxWidth) {
          let chunk = ''
          for (const char of line) {
            if (measure(chunk + char) > maxWidth && chunk) {
              lines.push(chunk)
              chunk = char
            } else chunk += char
          }
          line = chunk
        }
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines
}

export function drawText(ctx, box) {
  const {
    x, y, w, h, value, foreground, background, opaque,
    fontSize, fontFamily, bold, italic, align,
  } = box
  if (!value) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (opaque) {
    ctx.fillStyle = background
    ctx.fillRect(x, y, w, h)
  }
  ctx.font = fontString({ italic, bold, fontSize, fontFamily })
  ctx.fillStyle = foreground
  ctx.textBaseline = 'top'
  const lineHeight = fontSize * 1.2
  const lines = wrapTextLines((text) => ctx.measureText(text).width, value, Math.max(4, w))
  lines.forEach((line, index) => {
    const width = ctx.measureText(line).width
    let tx = x
    if (align === 'center') tx = x + (w - width) / 2
    if (align === 'right') tx = x + w - width
    ctx.fillText(line, tx, y + index * lineHeight)
  })
  ctx.restore()
}
