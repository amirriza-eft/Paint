export function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return Boolean(target.isContentEditable)
}

export function installShortcuts(handler) {
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
