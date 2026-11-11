export function capturePointer(event) {
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {
    // Synthetic events and cancelled pointers cannot be captured.
  }
}

export function coalescedPoints(event, toPoint) {
  const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null
  const list = events && events.length ? events : [event]
  return list.map((entry) => toPoint(entry.clientX, entry.clientY))
}
