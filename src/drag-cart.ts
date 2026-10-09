type Payload = { kind: 'shelf'; id: string } | { kind: 'cart'; index: number }
export function mountCartDrag(options: {
  allowed: () => boolean; freeze: () => void; commit: (payload: Payload) => void; announce: (text: string) => void
}) {
  let drag: { pointer: number; payload: Payload; handle: HTMLElement; ghost: HTMLElement } | undefined
  function cancel() {
    if (!drag) return
    const current = drag
    drag = undefined
    current.ghost.remove()
    if (current.handle.hasPointerCapture(current.pointer)) current.handle.releasePointerCapture(current.pointer)
    document.body.classList.remove('drag-active')
    document.querySelectorAll('.drop-ready').forEach(node => node.classList.remove('drop-ready'))
    options.freeze()
  }
  function target(x: number, y: number) {
    const zone = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]')
    return zone && zone.dataset.drop === (drag?.payload.kind === 'shelf' ? 'cart' : 'return') ? zone : null
  }
  document.addEventListener('pointerdown', event => {
    const handle = (event.target as Element).closest<HTMLElement>('[data-drag-product], [data-drag-entry]')
    if (!handle || event.button !== 0 || !event.isPrimary || !options.allowed()) return
    cancel()
    event.preventDefault()
    const payload: Payload = handle.dataset.dragProduct !== undefined
      ? { kind: 'shelf', id: handle.dataset.dragProduct }
      : { kind: 'cart', index: Number(handle.dataset.dragEntry) }
    const ghost = document.createElement('div')
    ghost.className = 'drag-ghost'
    ghost.textContent = '1 pachet'
    // Keep the ghost in the dialog's top layer, without participating in hit testing.
    ;(handle.closest('dialog') ?? document.body).append(ghost)
    ghost.style.left = `${event.clientX}px`
    ghost.style.top = `${event.clientY}px`
    drag = { pointer: event.pointerId, payload, handle, ghost }
    handle.setPointerCapture(event.pointerId)
    options.freeze()
    document.body.classList.add('drag-active')
    options.announce(payload.kind === 'shelf' ? 'Trage un pachet în cărucior. Escape anulează.' : 'Trage exact un pachet spre Pune înapoi. Escape anulează.')
  })
  document.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return
    event.preventDefault()
    drag.ghost.style.left = `${event.clientX}px`
    drag.ghost.style.top = `${event.clientY}px`
    document.querySelectorAll('.drop-ready').forEach(node => node.classList.remove('drop-ready'))
    target(event.clientX, event.clientY)?.classList.add('drop-ready')
  }, { passive: false })
  document.addEventListener('pointerup', event => {
    if (!drag || drag.pointer !== event.pointerId) return
    const payload = drag.payload
    const valid = Boolean(target(event.clientX, event.clientY)) && options.allowed()
    cancel()
    if (valid) options.commit(payload)
    else options.announce('Mutare anulată. Lista nu s-a schimbat.')
  })
  document.addEventListener('pointercancel', cancel)
  document.addEventListener('lostpointercapture', cancel)
  window.addEventListener('blur', cancel)
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel() })
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) { event.preventDefault(); cancel() } }, true)
  document.addEventListener('close', cancel, true)
  return { cancel, active: () => Boolean(drag) }
}
