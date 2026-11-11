export function installWheelZoom(element, onZoom) {
  const onWheel = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    onZoom(event)
  }
  element.addEventListener('wheel', onWheel, { passive: false })
  return () => element.removeEventListener('wheel', onWheel)
}
