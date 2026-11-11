export async function writeImageToClipboard(canvas) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return false
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  return true
}

export async function readClipboardImageFile() {
  if (!navigator.clipboard?.read) return null
  const items = await navigator.clipboard.read()
  for (const item of items) {
    const type = item.types.find((entry) => entry.startsWith('image/'))
    if (!type) continue
    const blob = await item.getType(type)
    return new File([blob], 'clipboard.png', { type })
  }
  return null
}
